# CourseWeb Data Sync - Deployment Guide

This guide covers deploying the CourseWeb Data Sync tool to various cloud platforms after the major refactor that moved data scraping operations from the API service to a standalone containerized application.

## Overview

The data sync tool has been redesigned to:

- ✅ Run data scraping operations directly (no API calls)
- ✅ Support Docker containerization
- ✅ Work with cloud scheduling services
- ✅ Exit cleanly after completion
- ✅ Handle environment validation and error recovery

## Prerequisites

Before deploying, ensure you have:

### Required Services

- **Supabase**: Database and storage backend
- **Algolia**: Search index service
- **Container Registry**: GitHub Container Registry (GHCR)
- **Cloud Platform**: Google Cloud Run, AWS Lambda, Azure Container Instances, etc.

### Required Credentials

```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ALGOLIA_APP_ID=your-algolia-app-id
ALGOLIA_API_KEY=your-algolia-admin-api-key
```

## Build and Registry

### GitHub Actions (Automatic)

The package includes automatic CI/CD that builds and pushes Docker images to GHCR on every push to main:

```yaml
# .github/workflows/build.yaml includes:
build-and-push-data-sync:
  - builds Docker image
  - pushes to ghcr.io/nthumodifications/courseweb-data-sync:latest
  - tags with commit SHA and latest
```

### Manual Build

```bash
# Clone repository
git clone https://github.com/nthumodifications/courseweb.git
cd courseweb/tools/data-sync

# Build image
docker build -t courseweb-data-sync .

# Test locally
cp .env.example .env
# Edit .env with your credentials
docker run --env-file .env courseweb-data-sync
```

## Cloud Deployments

### Google Cloud Run

#### Method 1: One-time Job with Cloud Scheduler

```bash
# Deploy the service (no traffic, manual triggers only)
gcloud run deploy courseweb-data-sync \
  --image ghcr.io/nthumodifications/courseweb-data-sync:latest \
  --platform managed \
  --region asia-east1 \
  --no-allow-unauthenticated \
  --set-env-vars SUPABASE_URL=${SUPABASE_URL},SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY},ALGOLIA_APP_ID=${ALGOLIA_APP_ID},ALGOLIA_API_KEY=${ALGOLIA_API_KEY} \
  --max-instances 1 \
  --timeout 3600 \
  --memory 2Gi \
  --cpu 2 \
  --execution-environment gen2 \
  --no-traffic

# Create Cloud Scheduler job
gcloud scheduler jobs create http courseweb-sync-daily \
  --location asia-east1 \
  --schedule "0 8 * * *" \
  --uri "https://courseweb-data-sync-xxx.a.run.app" \
  --http-method POST \
  --oidc-service-account-email courseweb-sync@your-project.iam.gserviceaccount.com \
  --headers "Content-Type=application/json" \
  --message-body '{"semester":"11410"}'
```

#### Method 2: Cloud Run Jobs (Recommended)

```bash
# Create a Cloud Run Job
gcloud run jobs create courseweb-data-sync-job \
  --image ghcr.io/nthumodifications/courseweb-data-sync:latest \
  --region asia-east1 \
  --set-env-vars SUPABASE_URL=${SUPABASE_URL},SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY},ALGOLIA_APP_ID=${ALGOLIA_APP_ID},ALGOLIA_API_KEY=${ALGOLIA_API_KEY} \
  --max-retries 3 \
  --task-timeout 3600 \
  --memory 2Gi \
  --cpu 2

# Execute manually
gcloud run jobs execute courseweb-data-sync-job --region asia-east1

# Schedule with Cloud Scheduler
gcloud scheduler jobs create http courseweb-sync-scheduled \
  --location asia-east1 \
  --schedule "0 8 * * *" \
  --uri "https://asia-east1-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/your-project/jobs/courseweb-data-sync-job:run" \
  --http-method POST \
  --oauth-service-account-email courseweb-sync@your-project.iam.gserviceaccount.com
```

#### Method 3: Terraform Deployment

```hcl
# terraform/data-sync.tf
resource "google_cloud_run_v2_job" "courseweb_data_sync" {
  name         = "courseweb-data-sync"
  location     = "asia-east1"
  launch_stage = "GA"

  template {
    template {
      containers {
        image = "ghcr.io/nthumodifications/courseweb-data-sync:latest"

        env {
          name  = "SUPABASE_URL"
          value = var.supabase_url
        }

        env {
          name = "SUPABASE_SERVICE_ROLE_KEY"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.supabase_key.secret_id
              version = "latest"
            }
          }
        }

        env {
          name  = "ALGOLIA_APP_ID"
          value = var.algolia_app_id
        }

        env {
          name = "ALGOLIA_API_KEY"
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.algolia_key.secret_id
              version = "latest"
            }
          }
        }

        resources {
          limits = {
            memory = "2Gi"
            cpu    = "2000m"
          }
        }
      }

      max_retries = 3
      task_count  = 1

      timeout = "3600s"
    }
  }
}

resource "google_cloud_scheduler_job" "courseweb_sync" {
  name      = "courseweb-data-sync"
  region    = "asia-east1"
  schedule  = "0 8 * * *"
  time_zone = "Asia/Taipei"

  http_target {
    http_method = "POST"
    uri         = "https://asia-east1-run.googleapis.com/apis/run.googleapis.com/v1/namespaces/${var.project_id}/jobs/${google_cloud_run_v2_job.courseweb_data_sync.name}:run"

    oauth_token {
      service_account_email = google_service_account.courseweb_sync.email
    }
  }
}
```

### AWS

#### AWS Lambda with Container Images

```bash
# Create ECR repository
aws ecr create-repository --repository-name courseweb-data-sync

# Get login token and login
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789012.dkr.ecr.us-east-1.amazonaws.com

# Tag and push image
docker tag courseweb-data-sync:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/courseweb-data-sync:latest
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/courseweb-data-sync:latest

# Create Lambda function
aws lambda create-function \
  --function-name courseweb-data-sync \
  --package-type Image \
  --code ImageUri=123456789012.dkr.ecr.us-east-1.amazonaws.com/courseweb-data-sync:latest \
  --role arn:aws:iam::123456789012:role/lambda-execution-role \
  --timeout 900 \
  --memory-size 2048 \
  --environment Variables='{SUPABASE_URL=xxx,SUPABASE_SERVICE_ROLE_KEY=xxx,ALGOLIA_APP_ID=xxx,ALGOLIA_API_KEY=xxx}'
```

#### ECS with Scheduled Tasks

```yaml
# ecs-task-definition.json
{
  "family": "courseweb-data-sync",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "containerDefinitions":
    [
      {
        "name": "data-sync",
        "image": "ghcr.io/nthumodifications/courseweb-data-sync:latest",
        "essential": true,
        "logConfiguration":
          {
            "logDriver": "awslogs",
            "options":
              {
                "awslogs-group": "/ecs/courseweb-data-sync",
                "awslogs-region": "us-east-1",
                "awslogs-stream-prefix": "ecs",
              },
          },
        "environment":
          [
            { "name": "SUPABASE_URL", "value": "xxx" },
            { "name": "SUPABASE_SERVICE_ROLE_KEY", "value": "xxx" },
            { "name": "ALGOLIA_APP_ID", "value": "xxx" },
            { "name": "ALGOLIA_API_KEY", "value": "xxx" },
          ],
      },
    ],
}
```

### Azure Container Instances

```bash
# Create resource group
az group create --name courseweb-rg --location eastus

# Create container instance
az container create \
  --resource-group courseweb-rg \
  --name courseweb-data-sync \
  --image ghcr.io/nthumodifications/courseweb-data-sync:latest \
  --restart-policy Never \
  --cpu 2 \
  --memory 2 \
  --environment-variables \
    SUPABASE_URL=xxx \
    SUPABASE_SERVICE_ROLE_KEY=xxx \
    ALGOLIA_APP_ID=xxx \
    ALGOLIA_API_KEY=xxx
```

### Kubernetes

```yaml
# k8s-cronjob.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: courseweb-data-sync
spec:
  schedule: "0 8 * * *"
  timeZone: "Asia/Taipei"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: data-sync
              image: ghcr.io/nthumodifications/courseweb-data-sync:latest
              env:
                - name: SUPABASE_URL
                  valueFrom:
                    secretKeyRef:
                      name: courseweb-secrets
                      key: supabase-url
                - name: SUPABASE_SERVICE_ROLE_KEY
                  valueFrom:
                    secretKeyRef:
                      name: courseweb-secrets
                      key: supabase-key
                - name: ALGOLIA_APP_ID
                  valueFrom:
                    secretKeyRef:
                      name: courseweb-secrets
                      key: algolia-app-id
                - name: ALGOLIA_API_KEY
                  valueFrom:
                    secretKeyRef:
                      name: courseweb-secrets
                      key: algolia-key
              resources:
                limits:
                  memory: "2Gi"
                  cpu: "2000m"
                requests:
                  memory: "1Gi"
                  cpu: "1000m"
          restartPolicy: OnFailure
      backoffLimit: 3
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 1
```

## Environment Configuration

### Production Environment Variables

```bash
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ALGOLIA_APP_ID=your-algolia-app-id
ALGOLIA_API_KEY=your-algolia-admin-api-key

# Optional
SEMESTER=11410                    # Default semester
CRON_PATTERN="0 8 * * *"         # Default schedule
```

### Secrets Management

#### Google Cloud Secret Manager

```bash
# Store secrets
gcloud secrets create supabase-service-role-key --data-file=-
gcloud secrets create algolia-api-key --data-file=-

# Grant access to service account
gcloud secrets add-iam-policy-binding supabase-service-role-key \
  --member="serviceAccount:courseweb-sync@your-project.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

#### AWS Secrets Manager

```bash
# Create secrets
aws secretsmanager create-secret \
  --name courseweb/supabase-key \
  --description "Supabase service role key" \
  --secret-string "your-key"

aws secretsmanager create-secret \
  --name courseweb/algolia-key \
  --description "Algolia API key" \
  --secret-string "your-key"
```

## Monitoring and Logging

### Google Cloud Monitoring

```bash
# Create log-based metric
gcloud logging metrics create courseweb_sync_success \
  --description="CourseWeb sync success count" \
  --log-filter='resource.type="cloud_run_job" AND textPayload:"Course synchronization completed successfully"'

# Create alerting policy
gcloud alpha monitoring policies create --policy-from-file=alert-policy.yaml
```

### Custom Dashboards

Create monitoring dashboards to track:

- ✅ Execution success/failure rates
- ⏱️ Execution duration
- 📊 Courses scraped per run
- 🔍 Algolia sync performance
- 💾 Memory and CPU usage

### Log Analysis Queries

```sql
-- Google Cloud Logging
resource.type="cloud_run_job"
AND resource.labels.job_name="courseweb-data-sync"
AND (
  textPayload:"Course synchronization completed successfully"
  OR textPayload:"Error during course synchronization"
)

-- AWS CloudWatch Insights
fields @timestamp, @message
| filter @message like /Course synchronization/
| sort @timestamp desc
```

## Troubleshooting

### Common Issues

#### 1. Memory Limits

```bash
# Increase memory allocation
--memory 3Gi  # Cloud Run
--memory-size 3008  # Lambda
```

#### 2. Timeout Issues

```bash
# Increase timeout
--timeout 3600  # Cloud Run (1 hour)
--timeout 900   # Lambda (15 minutes max)
```

#### 3. Environment Variable Issues

```bash
# Verify environment in container
docker run --env-file .env courseweb-data-sync env | grep -E "(SUPABASE|ALGOLIA)"
```

#### 4. Network Connectivity

```bash
# Test from container
docker run --env-file .env courseweb-data-sync nslookup www.ccxp.nthu.edu.tw
```

### Debug Mode

```bash
# Run with debug output
docker run --env-file .env -e DEBUG=1 courseweb-data-sync

# Manual execution with different semester
docker run --env-file .env courseweb-data-sync tsx src/sync-courses.ts 11320
```

## Performance Optimization

### Resource Allocation

| Platform    | CPU    | Memory | Timeout |
| ----------- | ------ | ------ | ------- |
| Cloud Run   | 2 vCPU | 2Gi    | 1 hour  |
| Lambda      | N/A    | 2GB    | 15 min  |
| ECS Fargate | 1 vCPU | 2GB    | Custom  |

### Batch Processing

The application includes built-in optimizations:

- 🔄 Concurrent department processing (3 at a time)
- 📦 Database chunking (500 records per batch)
- ⏱️ Rate limiting to avoid overwhelming external services
- 🔁 Exponential backoff retry logic

## Cost Optimization

### Cloud Run Pricing (Estimated)

- **CPU**: ~$0.024 per hour
- **Memory**: ~$0.0025 per hour
- **Execution**: Daily 30-minute runs = ~$2.30/month

### AWS Lambda Pricing (Estimated)

- **Duration**: 30-minute runs with 2GB memory = ~$12.50/month
- **Requests**: Daily executions = ~$0.20/month

### Recommendations

1. Use Cloud Run Jobs for cost-effective scheduled execution
2. Set appropriate resource limits to avoid over-provisioning
3. Monitor execution metrics to optimize resource allocation
4. Consider using preemptible/spot instances where available

## Security Best Practices

### Container Security

- ✅ Non-root user in container
- ✅ Minimal base image (Alpine Linux)
- ✅ No sensitive data in image layers
- ✅ Regular security updates

### Access Control

- 🔐 Service accounts with minimal required permissions
- 🔑 Secrets stored in dedicated secret management services
- 🛡️ Network policies to restrict outbound traffic
- 📝 Audit logging enabled

### Data Protection

- 🔒 TLS encryption for all external communications
- 🔐 Encrypted environment variables
- 🗑️ Automatic cleanup of temporary data
- 📋 Regular security assessments

## Maintenance

### Updates

- 🔄 Docker images are automatically built on code changes
- 📦 Update deployments by pulling latest image
- 🧪 Test updates in staging environment first
- 📅 Schedule maintenance windows for major updates

### Backup and Recovery

- 💾 Database backups handled by Supabase
- 🔍 Algolia index snapshots
- 📊 Execution logs and metrics retention
- 🔄 Disaster recovery procedures documented

---

For additional support or questions, please refer to the main README.md or create an issue in the repository.
