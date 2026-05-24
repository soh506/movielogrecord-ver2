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

  # 静的ルートを先に明示（ワイルドカードより優先させる）
  custom_rule {
    source = "/movies/new/"
    target = "/movies/new/index.html"
    status = "200"
  }

  custom_rule {
    source = "/directors/new/"
    target = "/directors/new/index.html"
    status = "200"
  }

  # 編集ページを先に（詳細ページのワイルドカードより前に置く必要あり）
  custom_rule {
    source = "/movies/<id>/edit/"
    target = "/movies/_shell/edit/index.html"
    status = "200"
  }

  custom_rule {
    source = "/directors/<id>/edit/"
    target = "/directors/_shell/edit/index.html"
    status = "200"
  }

  # 動的ルート（/movies/123/ など）を _shell にリライト
  custom_rule {
    source = "/movies/<*>"
    target = "/movies/_shell/index.html"
    status = "200"
  }
}

resource "aws_amplify_branch" "main" {
  app_id      = aws_amplify_app.frontend.id
  branch_name = "master"

  enable_auto_build = true
}
