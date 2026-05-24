resource "aws_amplify_app" "frontend" {
  name         = "${var.app_name}-frontend"
  repository   = "https://github.com/${var.github_repo}"
  access_token = var.github_token
  platform     = "WEB"

  build_spec = <<-EOT
    version: 1
    appRoot: frontend
    frontend:
      phases:
        preBuild:
          commands:
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: out
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
  EOT

  environment_variables = {
    NEXT_PUBLIC_API_URL = "https://${aws_cloudfront_distribution.api.domain_name}/api"
  }

  # Amplify の <*> は末尾にしか置けないため、/edit は Next.js クライアントルーターに委ねる
  custom_rule {
    source = "/movies/<*>"
    target = "/movies/_shell/index.html"
    status = "200"
  }

  custom_rule {
    source = "/directors/<*>"
    target = "/directors/_shell/edit/index.html"
    status = "200"
  }
}

resource "aws_amplify_branch" "main" {
  app_id      = aws_amplify_app.frontend.id
  branch_name = "master"

  enable_auto_build = true
}
