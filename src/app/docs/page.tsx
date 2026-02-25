'use client';

import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';

// Swagger UI consists of heavy React components and references window/document,
// so it needs to be dynamically imported with SSR disabled.
const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function ApiDocsPage() {
  return (
    <div className="p-4">
      <div className="bg-white">
        <SwaggerUI url="/api/docs" />
      </div>
    </div>
  );
}
