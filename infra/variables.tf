variable "aws_region" {
  description = "AWSリージョン"
  type        = string
  default     = "ap-northeast-1"
}

variable "app_name" {
  description = "アプリケーション名（リソース命名に使用）"
  type        = string
  default     = "movielogrecord"
}

variable "db_username" {
  description = "RDS PostgreSQLのマスターユーザー名"
  type        = string
  default     = "postgres"
}

variable "db_password" {
  description = "RDS PostgreSQLのマスターパスワード"
  type        = string
  sensitive   = true
}

variable "django_secret_key" {
  description = "DjangoのSECRET_KEY"
  type        = string
  sensitive   = true
}

variable "github_token" {
  description = "AmplifyがGitHubに接続するためのPersonal Access Token"
  type        = string
  sensitive   = true
}

variable "github_repo" {
  description = "GitHubリポジトリ（例: soh506/movielogrecord-ver2）"
  type        = string
  default     = "soh506/movielogrecord-ver2"
}
