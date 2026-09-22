# Schema Org and JSON LD 

The underlying data format became a little more structured and precise - now using a standard (https://schema.org)

This allows for better compatibility - but the application needs to now read from .jsonld

Refactor and ensure this does not break functionality, nor should it corrupt data

## Cases

converted .jsonld files have been provided, feel free to use counts, random sampling, or other quality checks

Every link in AI, BUSINESS, ENGINEERING, HISTORY, PEOPLE should show up the same in the App

Tags whould still work as they have been

/sources view should operate exactly the same

## Cleanup

Internal code cleanup: Rename title→name, tags→keywords, published→datePublished, "alternate-url"→archivedAt in the internal model, then ripple it through the templates/views.

Do 1 item at a time with red green TDD, always ensure all tests are passing and at the end verify the full app works as expected

