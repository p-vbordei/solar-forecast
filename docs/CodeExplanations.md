# Code Explanations

## SvelteKit File-Based Routing System

### Overview
SvelteKit uses a **file-based routing** system where your folder structure automatically defines your application's routes. No manual route registration is needed - the framework handles it automatically based on your file organization.

### How It Works

#### 1. Folder Structure = URL Path
The folder structure under `/src/routes` directly maps to URLs:

```
src/routes/
├── +page.svelte                    → /
├── about/
│   └── +page.svelte                → /about
├── api/
│   ├── locations/
│   │   ├── +server.ts              → /api/locations
│   │   ├── test/
│   │   │   └── +server.ts          → /api/locations/test
│   │   └── [id]/
│   │       └── +server.ts          → /api/locations/123 (dynamic)
│   └── users/
│       └── +server.ts              → /api/users
```

#### 2. Special File Names
- **`+page.svelte`** = Frontend page component (renders HTML)
- **`+server.ts`** = API endpoint (backend logic)
- **`+layout.svelte`** = Shared layout wrapper for pages
- **`[param]`** = Dynamic route parameter (e.g., `[id]` captures any value)

#### 3. HTTP Methods in +server.ts
Each `+server.ts` file can export functions named after HTTP methods:

```typescript
// src/routes/api/locations/+server.ts

export const GET = () => {}     // handles GET /api/locations
export const POST = () => {}    // handles POST /api/locations
export const PUT = () => {}     // handles PUT /api/locations
export const DELETE = () => {}  // handles DELETE /api/locations
export const PATCH = () => {}   // handles PATCH /api/locations
```

### Real-World Example

#### Step 1: Create Your Controller
First, create a controller with your business logic:

```typescript
// src/lib/features/locations/controllers/LocationsController.ts
import type { RequestEvent } from '@sveltejs/kit';
import { json } from '@sveltejs/kit';

export class LocationsController {
    async test(event: RequestEvent) {
        return json({
            success: true,
            message: 'Test endpoint working',
            timestamp: new Date().toISOString()
        });
    }
}
```

#### Step 2: Create the Route File
Then create a `+server.ts` file that delegates to your controller:

```typescript
// src/routes/api/locations/test/+server.ts
import type { RequestHandler } from './$types';
import { LocationsController } from '$lib/features/locations/controllers/LocationsController';

const controller = new LocationsController();

export const GET: RequestHandler = (event) => controller.test(event);
```

#### Step 3: The Result
This automatically creates the endpoint: `GET http://localhost:5173/api/locations/test`

### Request Flow
Here's how a request flows through the system:

```
1. Browser Request: GET /api/locations/test
           ↓
2. SvelteKit Router: "Let me check /src/routes/api/locations/test/+server.ts"
           ↓
3. Finds File: +server.ts with exported GET function
           ↓
4. Executes: GET function → controller.test(event)
           ↓
5. Controller Logic: Processes request, returns JSON
           ↓
6. Response: JSON sent back to browser
```

### Dynamic Routes
Using brackets `[name]` creates dynamic segments:

```typescript
// File: src/routes/api/locations/[id]/+server.ts
export const GET: RequestHandler = async (event) => {
    const locationId = event.params.id;  // Captures the dynamic value
    // Fetch location with this ID...
    return json({ id: locationId });
}
```

This matches:
- `/api/locations/1` → `event.params.id = "1"`
- `/api/locations/abc` → `event.params.id = "abc"`
- `/api/locations/anything` → `event.params.id = "anything"`

### Key Differences from Traditional Frameworks

#### Traditional (Express/FastAPI):
```javascript
// You manually register each route
app.get('/api/locations', getAllLocations);
app.get('/api/locations/:id', getLocationById);
app.post('/api/locations', createLocation);
app.put('/api/locations/:id', updateLocation);
app.delete('/api/locations/:id', deleteLocation);
```

#### SvelteKit:
```
// Routes are automatic based on file structure
src/routes/api/locations/
├── +server.ts              // GET (all), POST (create)
└── [id]/
    └── +server.ts          // GET (one), PUT (update), DELETE (remove)
```

### Best Practices

1. **Keep +server.ts Files Thin**: They should only delegate to controllers
2. **Business Logic in Controllers**: All logic should be in controller classes
3. **Type Safety**: Use TypeScript types (`RequestHandler`, `RequestEvent`)
4. **Error Handling**: Handle errors in controllers, return appropriate HTTP status codes
5. **Consistent Structure**: Follow the Controller → Service → Repository pattern

### Common Patterns

#### API Versioning
```
src/routes/api/
├── v1/
│   └── locations/
│       └── +server.ts      → /api/v1/locations
└── v2/
    └── locations/
        └── +server.ts      → /api/v2/locations
```

#### Nested Resources
```
src/routes/api/
└── clients/
    └── [clientId]/
        └── locations/
            └── [locationId]/
                └── +server.ts  → /api/clients/123/locations/456
```

### Summary
- **No manual route registration** - the file system is your router
- **+server.ts files** define API endpoints
- **Export HTTP methods** (GET, POST, etc.) as named functions
- **Folder structure** determines the URL path
- **Controllers** contain your business logic, +server.ts just delegates

This system makes routes predictable and discoverable - you can look at the folder structure and immediately know all available endpoints!

## Global Error Handling System

### Overview
To eliminate repetitive error handling code and ensure consistent API responses, the application uses a centralized error handling system with standardized response utilities.

### The Problem: Repetitive Error Handling
Without global error handling, every API controller method requires the same error handling boilerplate:

```typescript
async deleteLocation(event: RequestEvent): Promise<Response> {
    try {
        const locationId = event.params.id!;
        // Your business logic here
        return json({
            success: true,
            message: 'Location deleted successfully'
        });
    } catch (error) {
        // This same error handling code gets repeated in EVERY method
        console.error('API Error:', error);
        
        if (error instanceof ApiError) {
            return json({
                success: false,
                error: error.message,
                details: error.details,
                field: error.field
            }, { status: error.statusCode });
        }
        
        if (error instanceof Error) {
            if (error.message.includes('not found')) {
                return json({
                    success: false,
                    error: 'Resource not found'
                }, { status: 404 });
            }
            // ... more error pattern matching
        }
        
        return json({
            success: false,
            error: 'Internal server error'
        }, { status: 500 });
    }
}
```

### The Solution: Global Error Handling Components

#### 1. **Standardized API Responses** (`/src/lib/utils/ApiResponse.ts`)
Utility class for consistent response formatting:

```typescript
// Success responses
ApiResponse.success(data, message);           // 200 OK
ApiResponse.created(data, message);           // 201 Created
ApiResponse.successWithPagination(data, pagination, filters); // 200 with pagination

// Error responses
ApiResponse.badRequest(error, details, field);     // 400 Bad Request
ApiResponse.notFound(error, details);              // 404 Not Found
ApiResponse.conflict(error, details, code);        // 409 Conflict
ApiResponse.validationError(error, field, details); // 422 Validation Error
ApiResponse.internalError(error, details);         // 500 Internal Error
```

#### 2. **Custom Error Classes** (`/src/lib/utils/ApiErrors.ts`)
Structured error types that automatically map to HTTP status codes:

```typescript
// Generic errors
throw new BadRequestError('Invalid input', 'fieldName');
throw new NotFoundError('Resource not found');
throw new ValidationError('Validation failed', 'email');

// Domain-specific errors
throw new LocationNotFoundError(locationId);
throw new LocationExistsError(locationName);
throw new CoordinatesValidationError('Invalid latitude');
```

#### 3. **Global Error Handler** (`/src/lib/utils/ErrorHandler.ts`)
Centralized error processing that converts any error into a proper API response:

```typescript
// Automatic error handling wrapper
export function withErrorHandling<T extends (...args: any[]) => Promise<Response>>(
    method: T
): T {
    return (async (...args: any[]) => {
        try {
            return await method(...args);
        } catch (error) {
            return ErrorHandler.handle(error);
        }
    }) as T;
}
```

### Implementation Options

#### Option 1: Using the Error Handling Wrapper (Recommended)
Clean controller methods with automatic error handling:

```typescript
async deleteLocation(event: RequestEvent): Promise<Response> {
    return withErrorHandling(async () => {
        const locationId = event.params.id!;
        
        // Just your business logic - errors handled automatically
        // Throw custom errors when needed:
        // throw new LocationNotFoundError(locationId);
        
        return ApiResponse.success(undefined, 'Location deleted successfully');
    })();
}
```

#### Option 2: Manual Try-Catch (Traditional)
Explicit error handling with manual try-catch blocks:

```typescript
async deleteLocation(event: RequestEvent): Promise<Response> {
    try {
        const locationId = event.params.id!;
        
        // Your business logic here
        
        return ApiResponse.success(undefined, 'Location deleted successfully');
    } catch (error) {
        return ErrorHandler.handle(error);
    }
}
```

#### Option 3: No Error Handling in Controller
Let errors bubble up to be handled at a higher level (not recommended):

```typescript
async deleteLocation(event: RequestEvent): Promise<Response> {
    const locationId = event.params.id!;
    
    // Errors would need to be caught elsewhere
    // throw new LocationNotFoundError(locationId);
    
    return ApiResponse.success(undefined, 'Location deleted successfully');
}
```

### Benefits of Global Error Handling

#### 1. **Consistency**
- All API endpoints return the same error response format
- Standardized HTTP status codes across the application
- Consistent error message structure

#### 2. **DRY Principle (Don't Repeat Yourself)**
- Error handling logic is written once and reused everywhere
- No repetitive try-catch blocks in controller methods
- Centralized error logging and monitoring

#### 3. **Maintainability**
- Changes to error handling behavior only need to be made in one place
- Easy to add new error types or modify existing ones
- Clear separation between business logic and error handling

#### 4. **Type Safety**
- Custom error classes provide type-safe error handling
- Compiler ensures all error types are properly handled
- IntelliSense support for error properties

#### 5. **Developer Experience**
- Controllers focus on business logic, not error handling boilerplate
- Easy to throw domain-specific errors with meaningful messages
- Automatic conversion of errors to proper HTTP responses

### Error Response Format
All errors follow a consistent JSON structure:

```json
{
  "success": false,
  "error": "Human-readable error message",
  "details": "Additional technical details",
  "field": "fieldName",  // For validation errors
  "code": "ERROR_CODE"   // Machine-readable error code
}
```

### Usage Examples

```typescript
// In your service layer, just throw appropriate errors:
if (!location) {
    throw new LocationNotFoundError(locationId);
}

if (existingLocation) {
    throw new LocationExistsError(locationData.name);
}

if (!isValidCoordinate(lat, lng)) {
    throw new CoordinatesValidationError('Invalid coordinates provided');
}

// The global error handler automatically converts these to proper API responses:
// LocationNotFoundError → 404 response
// LocationExistsError → 409 Conflict response  
// CoordinatesValidationError → 422 Validation Error response
```

This system ensures that all API endpoints handle errors consistently while keeping controller code clean and focused on business logic.