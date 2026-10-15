# Article 1: Terraform, ECS, and a $40 voucher
## Prompt, instructions, reference materials, and article direction
### Updated: 2026-07-16

---

## Title

Primary:
**"Terraform, ECS, and a $40 Voucher"**

Alternatives:
- "Building RAVENCRY on Alibaba Cloud with Terraform and ECS"
- "What I learned putting a Docker Compose stack on Alibaba Cloud"
- "A practical first run with Alibaba Cloud ECS"

---

## Article purpose

Write a firsthand technical guide about using Alibaba Cloud for the RAVENCRY hackathon build.

This article is not a migration story. Do not frame it as AWS versus Alibaba Cloud. Do not say the project moved from AWS, rolled back from Alibaba Cloud, or compare Alibaba Cloud negatively with another provider. The reader should come away with a practical sense of how I used Alibaba Cloud ECS, Terraform, RAM, EIP, security groups, and the CLI from my own engineering point of view.

The tone should be calm and useful. It should feel like an engineer documenting the path he would give to another builder before they open the console.

---

## Required reading

Read these before writing:

1. `prompt-system/articles/master-plan.md` - global article rules, tone, cross-linking map
2. `prompt-system/skills/anti-ai-writing.md` - human writing rules
3. `infra/aliyun/main.tf` - VPC, VSwitch, security group, ECS, EIP, RAM role
4. `infra/aliyun/variables.tf` - `ecs.g8ine.large`, region, SSH key and password fallback
5. `infra/aliyun/user_data.sh` - first-boot install script
6. `infra/aliyun/outputs.tf` - outputs and deployment reminder
7. `infra/aliyun/terraform.tfvars.example` - variable template
8. `steps_aliyun.md` - deployment steps, Alibaba CLI commands, troubleshooting notes
9. `notes.md` - Alibaba CLI notes on Windows and WSL
10. `pending_fix.md` - production drift context

Use `hackathon_context.md` only for local project context. Do not reuse the migration framing from that file.

---

## What to avoid

- No AWS comparison framing
- No "migration" framing
- No "rollback" framing
- No anti-Alibaba tone
- No long discussion of account lockouts or anti-fraud events
- No pricing claims unless checked against current official sources
- No claim that the deployment was fully completed unless the repo proves it
- No invented screenshots or external links

Short mentions are allowed when they help the reader understand a local decision. Example: "the database was already outside this Terraform module, so the Alibaba Cloud work focused on compute, networking, and deployment."

---

## Angle

The article should answer this question:

> If I had to explain my first practical Alibaba Cloud setup to another hackathon builder, what would I show them?

Use the $40 voucher as the opening hook. The voucher gives the story a human entry point, but the article should quickly move into the real setup:

- choosing ECS for a Docker Compose workload
- writing the Terraform module
- creating a VPC and VSwitch
- opening only the ports the app needed at this stage
- attaching an EIP
- adding a RAM role for later OSS or KMS work
- using user data to make a fresh Ubuntu instance useful on first boot
- checking instance type availability with the Alibaba Cloud CLI
- writing down the small mistakes so the next run is cleaner

---

## Suggested structure

### Opening

Start with the title idea: Terraform, ECS, and a $40 voucher.

The hackathon was on Alibaba Cloud. I had a Docker Compose stack, a limited credit, and a clear job: get the compute layer ready without turning the setup into a cloud debate.

Keep this short. No long backstory.

### What I wanted from Alibaba Cloud

Explain the requirements in plain language:

- one VM class that could run the stack
- stable public IP
- security group rules for SSH, HTTP, HTTPS, and the dev API port
- repeatable setup through Terraform
- first-boot bootstrap through `user_data.sh`
- room for later Alibaba Cloud services through RAM

Mention `ecs.g8ine.large` as the selected type from `variables.tf`: 2 vCPU and 8GB RAM.

### The Terraform shape

Walk through `infra/aliyun/main.tf`:

- `alicloud_vpc`
- `alicloud_vswitch`
- `alicloud_security_group`
- ingress rules for ports `22`, `80`, `443`, and `3001`
- `alicloud_ecs_key_pair`
- `alicloud_instance`
- `alicloud_eip`
- `alicloud_eip_association`
- `alicloud_ram_role`

Keep it practical. Explain why each piece exists.

### Bootstrapping the machine

Use `infra/aliyun/user_data.sh` as the source:

- update and upgrade packages
- install Docker and Compose v2
- install Caddy, then stop and disable the host service because Caddy runs in Docker
- install Node.js 20
- install `postgresql-client`
- install git
- install the Alibaba Cloud CLI

Make this section useful for readers who want to adapt the pattern.

### CLI checks before Terraform apply

Explain the habit of asking Alibaba Cloud what is available before writing around assumptions.

Use this command:

```powershell
aliyun ecs DescribeAvailableResource --RegionId eu-west-1 --DestinationResource InstanceType --InstanceType ecs.g8ine.large
```

Mention that this check helped confirm the selected ECS class for the target region.

### Small lessons from the first run

List the lessons without making them sound like complaints:

- SSH usernames can differ by image and cloud defaults. Verify the image behavior.
- Key pair injection is worth testing early. Keep `ecs_password` as a sensitive fallback while setting up.
- PowerShell line continuation can quietly turn a CLI command into the wrong command. Use intermediate variables for long values such as public keys.
- Pace Terraform runs when working with a new account. Let resources settle before destroy and recreate loops.
- Keep secrets out of Terraform state and code.

### Where images fit

Add dev.to/Substack-friendly image slots in the article draft:

- after the opening: Alibaba Cloud console or ECS overview screenshot
- after the Terraform section: simple architecture diagram showing VPC, VSwitch, ECS, EIP, security group, and RAM role
- after the user data section: terminal screenshot of successful bootstrap or `docker compose ps`
- near the end: screenshot of the Terraform output or ECS public IP panel with sensitive values hidden

Use HTML comments in the article so they are easy to replace before publishing.

### Closing

Close on what the setup gave the project:

- repeatable infrastructure
- a clean ECS target for the Docker Compose stack
- a reusable Alibaba Cloud guide inside the repo
- a better habit of checking resource availability through the CLI

End with the series cross-link:

"In the next piece, we'll walk through every service in the RAVENCRY stack and why each one exists."

---

## Voice

First person. Practical. Calm.

No hype. No apology. No cloud war.

The narrator should sound like someone who has shipped under time pressure and is writing the guide he wishes he had before starting.

---

## Output target

The article should publish cleanly on dev.to or Substack:

- Markdown headings
- short paragraphs
- no footnote-heavy academic style
- image comments that can be swapped with real images
- code blocks only where they help
- no YAML front matter unless requested later

