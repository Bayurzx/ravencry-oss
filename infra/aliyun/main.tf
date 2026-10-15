# =============================================================================
# RAVENCRY — Alibaba Cloud Terraform
# Provisions: VPC, ECS, Security Groups, EIP, RAM Role
#
# STRATEGY: ECS on Alibaba Cloud for Docker Compose.
# Database:  Keep existing AWS Aurora (cross-cloud, already set up).
# Storage:   Keep existing AWS S3 (orphaned in code, no runtime change).
# Rate limit: Moved from DynamoDB → PostgreSQL table on Aurora.
#
# AWS → Alibaba Cloud mapping:
#   EC2 → ECS (ecs.g7.large)
#   Elastic IP → EIP
#   IAM → RAM
#   (Aurora, S3 — stay on AWS)
# =============================================================================

# ── Provider ──────────────────────────────────────────────────────────────
provider "alicloud" {
  region  = var.region
  profile = "default"
  max_retry_timeout = 60
}

# ── Data Sources ──────────────────────────────────────────────────────────
data "alicloud_zones" "default" {
  available_resource_creation = "VSwitch"
  available_disk_category     = "cloud_essd"
}

data "alicloud_images" "ubuntu" {
  name_regex  = "^ubuntu_24"
  most_recent = true
  owners      = "system"
}

# =============================================================================
# VPC + VSwitch
# =============================================================================

resource "alicloud_vpc" "ravencry" {
  vpc_name   = "${var.project}-vpc"
  cidr_block = "10.0.0.0/16"
  tags       = local.common_tags
}

resource "alicloud_vswitch" "primary" {
  vpc_id       = alicloud_vpc.ravencry.id
  cidr_block   = "10.0.1.0/24"
  zone_id      = data.alicloud_zones.default.zones[0].id
  vswitch_name = "${var.project}-vswitch-1"
  tags         = local.common_tags
}

# =============================================================================
# Security Group
# =============================================================================

resource "alicloud_security_group" "ecs" {
  security_group_name = "${var.project}-ecs-sg"
  description         = "RAVENCRY ECS security group"
  vpc_id              = alicloud_vpc.ravencry.id
  tags                = local.common_tags
}

resource "alicloud_security_group_rule" "ssh" {
  type              = "ingress"
  ip_protocol       = "tcp"
  nic_type          = "intranet"
  policy            = "accept"
  port_range        = "22/22"
  priority          = 1
  security_group_id = alicloud_security_group.ecs.id
  cidr_ip           = "0.0.0.0/0"
  description       = "SSH access"
}

resource "alicloud_security_group_rule" "http" {
  type              = "ingress"
  ip_protocol       = "tcp"
  nic_type          = "intranet"
  policy            = "accept"
  port_range        = "80/80"
  priority          = 1
  security_group_id = alicloud_security_group.ecs.id
  cidr_ip           = "0.0.0.0/0"
  description       = "HTTP access"
}

resource "alicloud_security_group_rule" "https" {
  type              = "ingress"
  ip_protocol       = "tcp"
  nic_type          = "intranet"
  policy            = "accept"
  port_range        = "443/443"
  priority          = 1
  security_group_id = alicloud_security_group.ecs.id
  cidr_ip           = "0.0.0.0/0"
  description       = "HTTPS access"
}

resource "alicloud_security_group_rule" "crucix" {
  type              = "ingress"
  ip_protocol       = "tcp"
  nic_type          = "intranet"
  policy            = "accept"
  port_range        = "3001/3001"
  priority          = 1
  security_group_id = alicloud_security_group.ecs.id
  cidr_ip           = "0.0.0.0/0"
  description       = "Crucix API (dev access)"
}

# =============================================================================
# SSH Key Pair — more secure than password; attach via CLI to running ECS
# =============================================================================

resource "alicloud_ecs_key_pair" "ravencry" {
  key_pair_name = "${var.project}-key"
  public_key    = var.ssh_pubkey
}

# =============================================================================
# ECS Instance (EC2 equivalent)
# Instance: ecs.g7.large (2 vCPU, 8GB RAM) — equivalent to t3.large
# OS: Ubuntu 24.04 LTS
# Storage: 30GB ESSD
# =============================================================================

resource "alicloud_instance" "ravencry" {
  instance_name              = "${var.project}-prod"
  host_name                  = "ravencry"
  instance_type              = var.ecs_instance_type
  image_id                   = data.alicloud_images.ubuntu.images[0].id
  vswitch_id                 = alicloud_vswitch.primary.id
  security_groups            = [alicloud_security_group.ecs.id]
  internet_max_bandwidth_out = 0
  internet_charge_type       = "PayByTraffic"

  system_disk_category = "cloud_essd"
  system_disk_size     = 30
  key_name             = alicloud_ecs_key_pair.ravencry.key_pair_name
  password             = var.ecs_password

  tags = local.common_tags

  # User data: install Docker, Caddy, Node.js, psql, git on first boot
  user_data = base64encode(templatefile("${path.module}/user_data.sh", {}))
}

# ── Elastic IP — static public IP, survives stop/start ────────────────────
resource "alicloud_eip" "ravencry" {
  bandwidth            = 10
  internet_charge_type = "PayByTraffic"
  payment_type         = "PayAsYouGo"
  address_name         = "${var.project}-eip"
  tags                 = local.common_tags
}

resource "alicloud_eip_association" "ravencry" {
  allocation_id = alicloud_eip.ravencry.id
  instance_id   = alicloud_instance.ravencry.id
}

# =============================================================================
# RAM Role for ECS (future-proofing — OSS, KMS access without hardcoded keys)
# =============================================================================

resource "alicloud_ram_role" "ecs" {
  role_name                    = "${var.project}-ecs-role"
  assume_role_policy_document  = data.alicloud_ram_policy_document.ecs_trust.document
  description                  = "RAVENCRY ECS instance role"
}

# Attach via CLI after TF creates instance (see steps_aliyun.md Step 6)
