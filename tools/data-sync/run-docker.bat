@echo off
setlocal enabledelayedexpansion

REM CourseWeb Data Sync - Docker Runner Script (Windows)
REM This script helps you run the data sync tool locally using Docker on Windows

REM Default values
set IMAGE_NAME=courseweb-data-sync
set CONTAINER_NAME=courseweb-data-sync-run
set SEMESTER=11420
set MODE=once
set CRON_PATTERN=0 8 * * *
set ENV_FILE=.env
set FORCE_BUILD=false
set FOLLOW_LOGS=false
set DETACHED=false

REM Parse command line arguments
:parse_args
if "%~1"=="" goto :end_parse
if "%~1"=="-m" (
    set MODE=%~2
    shift
    shift
    goto :parse_args
)
if "%~1"=="--mode" (
    set MODE=%~2
    shift
    shift
    goto :parse_args
)
if "%~1"=="-s" (
    set SEMESTER=%~2
    shift
    shift
    goto :parse_args
)
if "%~1"=="--semester" (
    set SEMESTER=%~2
    shift
    shift
    goto :parse_args
)
if "%~1"=="-c" (
    set CRON_PATTERN=%~2
    shift
    shift
    goto :parse_args
)
if "%~1"=="--cron" (
    set CRON_PATTERN=%~2
    shift
    shift
    goto :parse_args
)
if "%~1"=="-e" (
    set ENV_FILE=%~2
    shift
    shift
    goto :parse_args
)
if "%~1"=="--env" (
    set ENV_FILE=%~2
    shift
    shift
    goto :parse_args
)
if "%~1"=="-b" (
    set FORCE_BUILD=true
    shift
    goto :parse_args
)
if "%~1"=="--build" (
    set FORCE_BUILD=true
    shift
    goto :parse_args
)
if "%~1"=="-f" (
    set FOLLOW_LOGS=true
    shift
    goto :parse_args
)
if "%~1"=="--follow" (
    set FOLLOW_LOGS=true
    shift
    goto :parse_args
)
if "%~1"=="-d" (
    set DETACHED=true
    shift
    goto :parse_args
)
if "%~1"=="--detach" (
    set DETACHED=true
    shift
    goto :parse_args
)
if "%~1"=="-h" goto :show_help
if "%~1"=="--help" goto :show_help
echo [ERROR] Unknown option: %~1
goto :show_help

:end_parse

REM Validate mode
if not "%MODE%"=="once" if not "%MODE%"=="scheduled" (
    echo [ERROR] Invalid mode: %MODE%. Must be 'once' or 'scheduled'
    exit /b 1
)

REM Check if environment file exists
if not exist "%ENV_FILE%" (
    echo [ERROR] Environment file not found: %ENV_FILE%
    echo [INFO] Copy .env.example to %ENV_FILE% and configure your credentials
    exit /b 1
)

echo [INFO] Starting CourseWeb Data Sync
echo [INFO] Mode: %MODE%
echo [INFO] Semester: %SEMESTER%
if "%MODE%"=="scheduled" (
    echo [INFO] Cron Pattern: %CRON_PATTERN%
)
echo [INFO] Environment File: %ENV_FILE%

REM Build or check image
if "%FORCE_BUILD%"=="true" goto :build_image
docker image inspect %IMAGE_NAME% >nul 2>&1
if errorlevel 1 goto :build_image
goto :image_ready

:build_image
echo [INFO] Building Docker image: %IMAGE_NAME%
docker build -t %IMAGE_NAME% .
if errorlevel 1 (
    echo [ERROR] Failed to build Docker image
    exit /b 1
)
echo [SUCCESS] Docker image built successfully
goto :image_ready

:image_ready
echo [INFO] Using Docker image: %IMAGE_NAME%

REM Stop and remove existing container if it exists
docker ps -a --format "table {{.Names}}" | findstr /r /c:"^%CONTAINER_NAME%$" >nul 2>&1
if not errorlevel 1 (
    echo [INFO] Stopping and removing existing container: %CONTAINER_NAME%
    docker stop %CONTAINER_NAME% >nul 2>&1
    docker rm %CONTAINER_NAME% >nul 2>&1
)

REM Prepare Docker run command
set DOCKER_ARGS=
if "%DETACHED%"=="true" set DOCKER_ARGS=%DOCKER_ARGS% -d

REM Set command based on mode
if "%MODE%"=="once" (
    set CMD=tsx src/sync-courses.ts %SEMESTER%
) else (
    set CMD=tsx src/update-courses.ts "%CRON_PATTERN%" %SEMESTER%
)

REM Run container
echo [INFO] Starting container: %CONTAINER_NAME%
echo [INFO] Command: %CMD%

if "%DETACHED%"=="true" (
    for /f %%i in ('docker run %DOCKER_ARGS% --name %CONTAINER_NAME% --env-file %ENV_FILE% --rm %IMAGE_NAME% %CMD%') do set CONTAINER_ID=%%i
) else (
    docker run %DOCKER_ARGS% --name %CONTAINER_NAME% --env-file %ENV_FILE% --rm %IMAGE_NAME% %CMD%
)

if errorlevel 1 (
    echo [ERROR] Failed to start container
    exit /b 1
)

echo [SUCCESS] Container started successfully

if "%DETACHED%"=="true" (
    echo [INFO] Container ID: %CONTAINER_ID%
    echo [INFO] View logs with: docker logs -f %CONTAINER_NAME%
    echo [INFO] Stop container with: docker stop %CONTAINER_NAME%

    if "%FOLLOW_LOGS%"=="true" (
        echo [INFO] Following logs...
        docker logs -f %CONTAINER_NAME%
    )
) else (
    echo [INFO] Container completed
)

REM If scheduled mode and not detached, keep the script running
if "%MODE%"=="scheduled" if "%DETACHED%"=="false" (
    echo [INFO] Scheduled sync is running. Press Ctrl+C to stop.
    docker wait %CONTAINER_NAME%
)

echo [SUCCESS] Script completed
exit /b 0

:show_help
echo Usage: %~nx0 [OPTIONS]
echo.
echo Options:
echo   -m, --mode MODE        Run mode: 'once' or 'scheduled' ^(default: once^)
echo   -s, --semester SEM     Semester to sync ^(default: 11420^)
echo   -c, --cron PATTERN     Cron pattern for scheduled mode ^(default: '0 8 * * *'^)
echo   -e, --env FILE         Environment file path ^(default: .env^)
echo   -b, --build            Force rebuild the Docker image
echo   -f, --follow           Follow logs in real-time
echo   -d, --detach           Run in detached mode ^(background^)
echo   -h, --help             Show this help message
echo.
echo Examples:
echo   %~nx0                     # Run once with default semester
echo   %~nx0 -m once -s 11420    # Run once for semester 11420
echo   %~nx0 -m scheduled -c "0 */6 * * *"  # Run every 6 hours
echo   %~nx0 -b                  # Rebuild image and run once
echo   %~nx0 -d -f               # Run in background and follow logs
exit /b 0
