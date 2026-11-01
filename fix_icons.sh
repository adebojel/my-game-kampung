#!/bin/bash
set -e

echo "=================================================="
echo "🎨 CREATING MISSING MIPMAP & DRAWABLE ICONS..."
echo "=================================================="

mkdir -p app/src/main/res/drawable
mkdir -p app/src/main/res/mipmap-hdpi
mkdir -p app/src/main/res/mipmap-anydpi-v26

# 1. Buat Drawable Vector untuk Ikon Utama
cat << 'EOF' > app/src/main/res/drawable/ic_launcher.xml
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path
        android:fillColor="#6366F1"
        android:pathData="M54,12 C30.8,12 12,30.8 12,54 C12,77.2 30.8,96 54,96 C77.2,96 96,77.2 96,54 C96,30.8 77.2,12 54,12 Z M54,82 C38.5,82 26,69.5 26,54 C26,38.5 38.5,26 54,26 C69.5,26 82,38.5 82,54 C82,69.5 69.5,82 54,82 Z" />
</vector>
EOF

cp app/src/main/res/drawable/ic_launcher.xml app/src/main/res/drawable/ic_launcher_foreground.xml

# 2. Buat Mipmap Adaptive Icon
cat << 'EOF' > app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/primary" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
</adaptive-icon>
EOF

cat << 'EOF' > app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml
<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/primary" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
</adaptive-icon>
EOF

# 3. Perbarui AndroidManifest.xml
cat << 'EOF' > app/src/main/AndroidManifest.xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.superbrowser.app">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.MANAGE_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK" />

    <application
        android:allowBackup="true"
        android:icon="@drawable/ic_launcher"
        android:roundIcon="@drawable/ic_launcher"
        android:label="Super Browser"
        android:supportsRtl="true"
        android:theme="@style/Theme.AppCompat.Light.NoActionBar">

        <activity
            android:name=".ui.MainActivity"
            android:configChanges="orientation|screenSize|smallestScreenSize|screenLayout"
            android:supportsPictureInPicture="true"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="http" />
                <data android:scheme="https" />
            </intent-filter>
        </activity>

        <activity
            android:name=".ui.SettingsActivity"
            android:exported="false"
            android:label="Setelan Super Browser"
            android:parentActivityName=".ui.MainActivity" />

        <activity
            android:name=".ui.DownloadActivity"
            android:exported="false"
            android:label="Pengelola File &amp; Unduhan"
            android:parentActivityName=".ui.MainActivity" />

        <service
            android:name=".service.DownloaderService"
            android:foregroundServiceType="dataSync"
            android:exported="false" />

        <service
            android:name=".service.MediaPlaybackService"
            android:foregroundServiceType="mediaPlayback"
            android:exported="false" />

        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="${applicationId}.provider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths" />
        </provider>

    </application>
</manifest>
EOF

echo "=================================================="
echo "📦 COMMIT DAN PUSH PERBAIKAN IKON KE GITHUB..."
echo "=================================================="

git add .
git commit -m "Fix missing app launcher icons in manifest and resources" || true

CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
if [ -z "$CURRENT_BRANCH" ]; then
    CURRENT_BRANCH="main"
    git branch -M main
fi

git push origin "$CURRENT_BRANCH" --force || git push -u origin main --force

echo "=================================================="
echo "🚀 IKON SELESAI DIPERBAIKI! Silakan cek tab Actions di GitHub."
echo "=================================================="
