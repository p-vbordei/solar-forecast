import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="Solar Forecast API Documentation" />
    <title>Solar Forecast API - Swagger UI</title>
    <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css" />
    <style>
        html {
            box-sizing: border-box;
            overflow: -moz-scrollbars-vertical;
            overflow-y: scroll;
        }
        *, *:before, *:after {
            box-sizing: inherit;
        }
        body {
            margin:0;
            background: #ffffff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        
        /* Custom theme for Solar Forecast with white background */
        .swagger-ui {
            background: #ffffff !important;
            color: #333333 !important;
        }
        
        .swagger-ui .topbar {
            background: #ffffff !important;
            border-bottom: 1px solid #e5e5e5 !important;
        }
        
        .swagger-ui .topbar .topbar-wrapper {
            max-width: none !important;
        }
        
        .swagger-ui .topbar .topbar-wrapper .link {
            color: #333333 !important;
            font-weight: bold !important;
        }
        
        .swagger-ui .info .title {
            color: #333333 !important;
        }
        
        .swagger-ui .info .description {
            color: #666666 !important;
        }
        
        .swagger-ui .scheme-container {
            background: #ffffff !important;
            border: 1px solid #e5e5e5 !important;
        }
        
        .swagger-ui .opblock {
            background: #ffffff !important;
            border: 1px solid #e5e5e5 !important;
        }
        
        .swagger-ui .opblock .opblock-summary {
            background: #ffffff !important;
        }
        
        .swagger-ui .opblock.opblock-post {
            border-color: #e5e5e5 !important;
            background: #ffffff !important;
        }
        
        .swagger-ui .opblock.opblock-get {
            border-color: #e5e5e5 !important;
            background: #ffffff !important;
        }
        
        .swagger-ui .opblock.opblock-put {
            border-color: #e5e5e5 !important;
            background: #ffffff !important;
        }
        
        .swagger-ui .opblock.opblock-delete {
            border-color: #e5e5e5 !important;
            background: #ffffff !important;
        }
        
        .swagger-ui .btn.authorize,
        .swagger-ui .btn.execute {
            background: #f5f5f5 !important;
            border-color: #e5e5e5 !important;
            color: #333333 !important;
        }
        
        .swagger-ui .btn.authorize:hover,
        .swagger-ui .btn.execute:hover {
            background: #e5e5e5 !important;
            border-color: #cccccc !important;
        }
        
        .swagger-ui select,
        .swagger-ui input[type=text],
        .swagger-ui input[type=password],
        .swagger-ui input[type=search],
        .swagger-ui input[type=email],
        .swagger-ui input[type=url],
        .swagger-ui textarea {
            background: #ffffff !important;
            color: #333333 !important;
            border: 1px solid #e5e5e5 !important;
        }
        
        .swagger-ui .response-col_description__inner {
            background: #ffffff !important;
            border: 1px solid #e5e5e5 !important;
            color: #333333 !important;
        }
        
        .swagger-ui .model-box {
            background: #ffffff !important;
            border: 1px solid #e5e5e5 !important;
        }
        
        .swagger-ui .model .property {
            color: #333333 !important;
        }
        
        .swagger-ui .parameter__name {
            color: #333333 !important;
        }
        
        .swagger-ui .parameter__type {
            color: #666666 !important;
        }
        
        .swagger-ui .response-col_status {
            color: #333333 !important;
        }
        
        .swagger-ui .response-col_links {
            color: #333333 !important;
        }
        
        /* Make sure all other elements are white */
        .swagger-ui .wrapper,
        .swagger-ui .information-container,
        .swagger-ui .opblock-section,
        .swagger-ui .opblock-summary-description,
        .swagger-ui .opblock-description-wrapper,
        .swagger-ui .parameters-container,
        .swagger-ui .responses-wrapper,
        .swagger-ui .model-container,
        .swagger-ui .renderedMarkdown,
        .swagger-ui .tab li,
        .swagger-ui .tabitem {
            background: #ffffff !important;
            color: #333333 !important;
        }
        
        .swagger-ui .tab li button {
            background: #ffffff !important;
            color: #333333 !important;
            border-color: #e5e5e5 !important;
        }
        
        .swagger-ui .tab li.active button {
            background: #f5f5f5 !important;
            color: #333333 !important;
        }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    
    <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js" crossorigin></script>
    <script src="https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js" crossorigin></script>
    <script>
        window.onload = () => {
            window.ui = SwaggerUIBundle({
                url: '/api/swagger/spec',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout",
                docExpansion: "list",
                filter: true,
                tryItOutEnabled: true,
                requestInterceptor: (request) => {
                    return request;
                },
                responseInterceptor: (response) => {
                    return response;
                }
            });
        };
    </script>
</body>
</html>`;

    return new Response(html, {
        headers: {
            'Content-Type': 'text/html'
        }
    });
};