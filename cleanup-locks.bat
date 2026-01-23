@echo off
REM Cleanup script for locked reservations in production
REM Usage: cleanup-locks.bat [--remote]

setlocal

set REMOTE=

REM Parse arguments
:parse_args
if "%~1"=="" goto :main
if "%~1"=="--remote" (
    set REMOTE=--remote
    shift
    goto :parse_args
)
echo Unknown option: %~1
echo Usage: %~nx0 [--remote]
exit /b 1

:main
if "%REMOTE%"=="" (
    echo 🧹 Cleaning locked reservations from LOCAL database...
    echo ⚠️  Use --remote flag to clean production database
) else (
    echo 🧹 Cleaning locked reservations from REMOTE (production^) database...
    set /p confirm="Are you sure you want to clean production locks? (yes/no): "
    if not "!confirm!"=="yes" (
        echo ❌ Aborted.
        exit /b 0
    )
)

echo Deleting all locked reservations...
call npx wrangler d1 execute studio-natali-db %REMOTE% --command "DELETE FROM reservations WHERE status = 'locked';"

echo Cleaning up expired locks...
call npx wrangler d1 execute studio-natali-db %REMOTE% --command "DELETE FROM reservations WHERE status = 'locked' AND lock_expires_at < datetime('now');"

echo.
echo ✅ Cleanup completed!
echo Getting reservation stats...
call npx wrangler d1 execute studio-natali-db %REMOTE% --command "SELECT status, COUNT(*) as count FROM reservations GROUP BY status;"

echo.
echo Done! 🎉

endlocal
