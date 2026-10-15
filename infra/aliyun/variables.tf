# =============================================================================
# RAVENCRY Alibaba Cloud — Terraform Variables
# =============================================================================

variable "region" {
  description = "Alibaba Cloud region"
  type        = string
  default     = "eu-west-1"
}

variable "project" {
  description = "Project name for resource naming"
  type        = string
  default     = "ravencry"
}

# ── ECS ────────────────────────────────────────────────────────────────────
variable "ecs_instance_type" {
  description = "ECS instance type (AWS t3.large equivalent)"
  type        = string
  default     = "ecs.g8ine.large" # 2 vCPU, 8GB, Intel Xeon (only large type available in eu-west-1)
}

variable "ecs_password" {
  description = "ECS password (fallback; key-based auth preferred)"
  type        = string
  sensitive   = true
  default     = ""
}

variable "ssh_pubkey" {
  description = "Public SSH key for ECS access (content of ~/.ssh/id_ed25519.pub)"
  type        = string
  default     = ""
}

# ── Common Tags ────────────────────────────────────────────────────────────
locals {
  common_tags = {
    Project     = var.project
    Environment = "production"
    ManagedBy   = "terraform"
  }
}

# ── RAM Policy Documents ───────────────────────────────────────────────────
data "alicloud_ram_policy_document" "ecs_trust" {
  statement {
    effect = "Allow"
    action = ["sts:AssumeRole"]
    principal {
      entity      = "Service"
      identifiers = ["ecs.aliyuncs.com"]
    }
  }
}
