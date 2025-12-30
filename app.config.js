export default {
  "expo": {
    "name": "Oath",
    "slug": "Oath",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/splash-icon.png",
    "scheme": "oath",
    "userInterfaceStyle": "automatic",
    "newArchEnabled": true,
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.pm96.appOath",
      "googleServicesFile": process.env.GOOGLE_SERVICE_INFO_PLIST ?? (require('fs').existsSync('./GoogleService-Info.plist') ? './GoogleService-Info.plist' : undefined)
    },
    "android": {
      "adaptiveIcon": {
        "backgroundColor": "#E6F4FE",
        "foregroundImage": "./assets/images/splash-icon.png",
        "backgroundImage": "./assets/images/splash-icon.png",
        "monochromeImage": "./assets/images/splash-icon.png"
      },
      "edgeToEdgeEnabled": true,
      "predictiveBackGestureEnabled": false,
      "package": "com.pm96.appOath",
      "googleServicesFile": process.env.GOOGLE_SERVICES_JSON ?? (require('fs').existsSync('./google-services.json') ? './google-services.json' : undefined)
    },
    "notification": {
      "icon": "./assets/images/splash-icon.png",
      "color": "#ffffff",
      "androidMode": "default",
      "androidCollapsedTitle": "#{unread_notifications} new notifications"
    },
    "web": {
      "output": "static",
      "favicon": "./assets/images/splash-icon.png"
    },
    "plugins": [
      ["expo-router", { "unstable_useServerMiddleware": true }],
      [
        "expo-splash-screen",
        {
          "image": "./assets/images/splash-icon.png",
          "imageWidth": 200,
          "resizeMode": "contain",
          "backgroundColor": "#ffffff",
          "dark": {
            "backgroundColor": "#000000"
          }
        }
      ],
      [
        "expo-notifications",
        {
          "icon": "./assets/images/splash-icon.png",
          "color": "#ffffff",
          "sounds": []
        }
      ]
    ],
    "experiments": {
      "typedRoutes": true,
      "reactCompiler": true
    },
    "extra": {
      "router": {},
      "eas": {
        "projectId": "0e465e71-1e74-4280-b29a-d43a2445564b"
      }
    },
    "owner": "pm96",
    "updates": {
      "url": "https://u.expo.dev/0e465e71-1e74-4280-b29a-d43a2445564b"
    },
    "runtimeVersion": {
      "policy": "appVersion"
    }
  }
};
