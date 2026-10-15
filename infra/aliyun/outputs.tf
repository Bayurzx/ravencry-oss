# =============================================================================
# RAVENCRY Alibaba Cloud — Terraform Outputs
# =============================================================================

output "ecs_instance_id" {
  description = "ECS instance ID"
  value       = alicloud_instance.ravencry.id
}

output "ecs_public_ip" {
  description = "ECS public IP (Elastic IP — static, survives stop/start)"
  value       = alicloud_eip.ravencry.ip_address
}

output "ecs_private_ip" {
  description = "ECS private IP"
  value       = alicloud_instance.ravencry.private_ip
}

output "vpc_id" {
  description = "VPC ID"
  value       = alicloud_vpc.ravencry.id
}

output "security_group_id" {
  description = "Security Group ID"
  value       = alicloud_security_group.ecs.id
}

output "ram_role_name" {
  description = "RAM role name for ECS"
  value       = alicloud_ram_role.ecs.role_name
}

# ── Deployment Reminder ────────────────────────────────────────────────────
output "reminder" {
  value = <<-EOT

  ═══════════════════════════════════════════════════════════════
   AFTER `terraform apply`:
   1. SSH:  ssh ubuntu@${alicloud_eip.ravencry.ip_address}
   2. The ECS connects to YOUR EXISTING AWS Aurora (no Alibaba DB).
   3. Set AWS_* credentials in .env on the ECS for Aurora + S3.
   4. Run: aliyun ecs AttachInstanceRamRole → RAM role for ECS.
   5. See steps_aliyun.md for full deployment guide.
  ═══════════════════════════════════════════════════════════════
  EOT
}
