#!/bin/bash

# CourseWeb Data Sync - Docker Runner Script
# This script helps you run the data sync tool locally using Docker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
IMAGE_NAME="courseweb-data-sync"
CONTAINER_NAME="courseweb-data-sync-run"
SEMESTER="11410"
MODE="once"

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -m, --mode MODE        Run mode: 'once' or 'scheduled' (default: once)"
    echo "  -s, --semester SEM     Semester to sync (default: 11410)"
    echo "  -c, --cron PATTERN     Cron pattern for scheduled mode (default: '0 8 * * *')"
    echo "  -e, --env FILE         Environment file path (default: .env)"
    echo "  -b, --build            Force rebuild the Docker image"
    echo "  -f, --follow           Follow logs in real-time"
    echo "  -d, --detach           Run in detached mode (background)"
    echo "  -h, --help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                     # Run once with default semester"
    echo "  $0 -m once -s 11410    # Run once for semester 11410"
    echo "  $0 -m scheduled -c '0 */6 * * *'  # Run every 6 hours"
    echo "  $0 -b                  # Rebuild image and run once"
    echo "  $0 -d -f               # Run in background and follow logs"
}

# Parse command line arguments
CRON_PATTERN="0 8 * * *"
ENV_FILE=".env"
FORCE_BUILD=false
FOLLOW_LOGS=false
DETACHED=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -m|--mode)
            MODE="$2"
            shift 2
            ;;
        -s|--semester)
            SEMESTER="$2"
            shift 2
            ;;
        -c|--cron)
            CRON_PATTERN="$2"
            shift 2
            ;;
        -e|--env)
            ENV_FILE="$2"
            shift 2
            ;;
        -b|--build)
            FORCE_BUILD=true
            shift
            ;;
        -f|--follow)
            FOLLOW_LOGS=true
            shift
            ;;
        -d|--detach)
            DETACHED=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate mode
if [[ "$MODE" != "once" && "$MODE" != "scheduled" ]]; then
    print_error "Invalid mode: $MODE. Must be 'once' or 'scheduled'"
    exit 1
fi

# Check if environment file exists
if [[ ! -f "$ENV_FILE" ]]; then
    print_error "Environment file not found: $ENV_FILE"
    print_info "Copy .env.example to $ENV_FILE and configure your credentials"
    exit 1
fi

print_info "Starting CourseWeb Data Sync"
print_info "Mode: $MODE"
print_info "Semester: $SEMESTER"
if [[ "$MODE" == "scheduled" ]]; then
    print_info "Cron Pattern: $CRON_PATTERN"
fi
print_info "Environment File: $ENV_FILE"

# Build or check image
if [[ "$FORCE_BUILD" == true ]] || ! docker image inspect $IMAGE_NAME >/dev/null 2>&1; then
    print_info "Building Docker image: $IMAGE_NAME"
    docker build -t $IMAGE_NAME .

    if [[ $? -eq 0 ]]; then
        print_success "Docker image built successfully"
    else
        print_error "Failed to build Docker image"
        exit 1
    fi
else
    print_info "Using existing Docker image: $IMAGE_NAME"
fi

# Stop and remove existing container if it exists
if docker ps -a --format 'table {{.Names}}' | grep -q "^$CONTAINER_NAME$"; then
    print_info "Stopping and removing existing container: $CONTAINER_NAME"
    docker stop $CONTAINER_NAME >/dev/null 2>&1 || true
    docker rm $CONTAINER_NAME >/dev/null 2>&1 || true
fi

# Prepare Docker run command
DOCKER_ARGS=""

if [[ "$DETACHED" == true ]]; then
    DOCKER_ARGS="$DOCKER_ARGS -d"
fi

# Set command based on mode
if [[ "$MODE" == "once" ]]; then
    CMD="tsx src/sync-courses.ts $SEMESTER"
else
    CMD="tsx src/update-courses.ts \"$CRON_PATTERN\" $SEMESTER"
fi

# Run container
print_info "Starting container: $CONTAINER_NAME"
print_info "Command: $CMD"

CONTAINER_ID=$(docker run $DOCKER_ARGS \
    --name $CONTAINER_NAME \
    --env-file $ENV_FILE \
    --rm \
    $IMAGE_NAME $CMD)

if [[ $? -eq 0 ]]; then
    print_success "Container started successfully"

    if [[ "$DETACHED" == true ]]; then
        print_info "Container ID: $CONTAINER_ID"
        print_info "View logs with: docker logs -f $CONTAINER_NAME"
        print_info "Stop container with: docker stop $CONTAINER_NAME"

        if [[ "$FOLLOW_LOGS" == true ]]; then
            print_info "Following logs..."
            docker logs -f $CONTAINER_NAME
        fi
    else
        print_info "Container completed"
    fi
else
    print_error "Failed to start container"
    exit 1
fi

# If scheduled mode and not detached, keep the script running
if [[ "$MODE" == "scheduled" && "$DETACHED" == false ]]; then
    print_info "Scheduled sync is running. Press Ctrl+C to stop."

    # Handle Ctrl+C
    trap 'print_info "Stopping container..."; docker stop $CONTAINER_NAME; exit 0' INT

    # Wait for container to finish (which should be never for scheduled mode)
    docker wait $CONTAINER_NAME
fi

print_success "Script completed"
