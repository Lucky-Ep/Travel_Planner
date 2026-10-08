# Backend local configuration

Use Java 21 and a local PostgreSQL database. Database settings can be
provided through DB_URL, DB_USERNAME, and DB_PASSWORD.

## Google Maps API key

Set GOOGLE_MAPS_API_KEY in your shell or IDE run configuration before
starting the application. Use your own Google Cloud key with the
Directions API enabled and appropriate API/application restrictions.

PowerShell example, from tp_backend:

```powershell
$env:GOOGLE_MAPS_API_KEY = "<your-own-key>"
.\gradlew.bat bootRun
```

The application has no bundled Google API key. Do not commit real keys
to source files, configuration files, or shared IDE settings.

A .env file is not automatically loaded by this application; use shell
environment variables or your IDE's environment configuration.

## Tests

```powershell
.\gradlew.bat test
```

Normal tests do not call live Google APIs and do not require a real
Google key. The application-context test still requires PostgreSQL.

The live method in RoutePlanningTest is disabled under JUnit.
To deliberately run it, invoke RoutePlanningTest.main() from your IDE
with GOOGLE_MAPS_API_KEY configured. This makes a real Google Directions
request and may incur charges. Setting the key alone does not enable
the live JUnit test.
