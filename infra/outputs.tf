output "alb_dns_name" {
  description = "ALBのDNS名（バックエンドAPIのエンドポイント）"
  value       = aws_lb.main.dns_name
}

output "ecr_repository_url" {
  description = "ECRリポジトリURL（DockerイメージのPush先）"
  value       = aws_ecr_repository.backend.repository_url
}

output "rds_endpoint" {
  description = "RDSのエンドポイント"
  value       = aws_db_instance.main.address
}

output "amplify_default_domain" {
  description = "AmplifyのデフォルトドメインURL"
  value       = "https://${aws_amplify_app.frontend.default_domain}"
}
