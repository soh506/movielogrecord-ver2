# ECS タスク用 IAM ロール（CloudWatch Logs・ECR アクセス権）
resource "aws_iam_role" "ecs_task_execution" {
  name = "${var.app_name}-ecs-task-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution" {
  role       = aws_iam_role.ecs_task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ECS タスク用セキュリティグループ（ALBからの8000のみ許可）
resource "aws_security_group" "ecs_task" {
  name   = "${var.app_name}-ecs-task-sg"
  vpc_id = aws_vpc.main.id

  ingress {
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.app_name}-ecs-task-sg" }
}

# CloudWatch Logs グループ
resource "aws_cloudwatch_log_group" "backend" {
  name              = "/ecs/${var.app_name}-backend"
  retention_in_days = 7
}

resource "aws_ecs_cluster" "main" {
  name = "${var.app_name}-cluster"
}

resource "aws_ecs_task_definition" "backend" {
  family                   = "${var.app_name}-backend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.ecs_task_execution.arn

  container_definitions = jsonencode([{
    name  = "backend"
    image = "${aws_ecr_repository.backend.repository_url}:latest"

    portMappings = [{
      containerPort = 8000
      protocol      = "tcp"
    }]

    environment = [
      { name = "DEBUG",                value = "False" },
      { name = "DB_HOST",              value = aws_db_instance.main.address },
      { name = "DB_NAME",              value = aws_db_instance.main.db_name },
      { name = "DB_USER",              value = var.db_username },
      { name = "CORS_ALLOWED_ORIGINS", value = "https://${aws_amplify_branch.main.branch_name}.${aws_amplify_app.frontend.default_domain}" },
      { name = "ALLOWED_HOSTS",        value = "*" },
    ]

    secrets = [
      { name = "SECRET_KEY",   valueFrom = aws_ssm_parameter.django_secret_key.arn },
      { name = "DB_PASSWORD",  valueFrom = aws_ssm_parameter.db_password.arn },
    ]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.backend.name
        "awslogs-region"        = var.aws_region
        "awslogs-stream-prefix" = "ecs"
      }
    }
  }])
}

resource "aws_ecs_service" "backend" {
  name            = "${var.app_name}-backend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = [aws_subnet.private_a.id, aws_subnet.private_c.id]
    security_groups  = [aws_security_group.ecs_task.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = 8000
  }

  depends_on = [aws_lb_listener.http]
}

# SSM Parameter Store（機密情報をコードに書かない）
resource "aws_ssm_parameter" "django_secret_key" {
  name  = "/${var.app_name}/django_secret_key"
  type  = "SecureString"
  value = var.django_secret_key
}

resource "aws_ssm_parameter" "db_password" {
  name  = "/${var.app_name}/db_password"
  type  = "SecureString"
  value = var.db_password
}

# SSM からの読み取りを ECS タスク実行ロールに追加
resource "aws_iam_role_policy" "ecs_ssm" {
  name = "${var.app_name}-ecs-ssm-policy"
  role = aws_iam_role.ecs_task_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = ["ssm:GetParameters", "ssm:GetParameter"]
      Resource = [
        aws_ssm_parameter.django_secret_key.arn,
        aws_ssm_parameter.db_password.arn,
      ]
    }]
  })
}
