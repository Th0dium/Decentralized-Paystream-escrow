# Paystream Frontend - Development Guide

## Quick Start

```bash
# Install dependencies
npm install

# Create .env.local with your settings
cp .env.local .env.local

# Start development server
npm run dev

# Open http://localhost:3000
```

## Project Overview

This is a Next.js 14 web3 frontend for salary streaming with three user roles:
- **Company**: Create and manage employee streams
- **Employee**: Track streams, withdraw funds, submit milestones
- **Auditor**: Review and approve milestone submissions

## Key Technologies

| Technology | Purpose | Version |
|---|---|---|
| Next.js | Framework | 14.x |
| React | UI Library | 18.x |
| TypeScript | Type Safety | 5.3 |
| Tailwind CSS | Styling | 3.3 |
| Zustand | State Management | 4.4 |
| ethers.js | Blockchain | 6.13 |
| axios | HTTP Client | 1.6 |

## Folder Structure Explanation

### `/app` - Next.js Pages
- **layout.tsx**: Root layout wrapping all pages
- **page.tsx**: Landing page (/)
- **login/page.tsx**: Wallet connection
- **dashboard/**: Protected routes requiring authentication
  - **layout.tsx**: Dashboard wrapper with sidebar + header
  - **page.tsx**: Overview dashboard
  - **employee/**: Employee-specific pages
  - **company/**: Company-specific pages
  - **auditor/**: Auditor-specific pages

### `/components` - Reusable Components
- **Header.tsx**: Top navigation bar
- **Sidebar.tsx**: Left navigation (role-aware)
- **Button.tsx**: Styled button with variants
- **Card.tsx**: Content container

### `/lib` - Core Logic
- **api-client.ts**: Axios configuration + API methods
- **auth-store.ts**: Zustand store for auth state
- **hooks.ts**: Custom React hooks for data fetching
- **types.ts**: TypeScript interfaces
- **utils.ts**: Helper functions

## Common Tasks

### Adding a New Page

```bash
# Create the file in the appropriate route
touch app/dashboard/my-new-page/page.tsx
```

```typescript
// app/dashboard/my-new-page/page.tsx
"use client";

export default function MyNewPage() {
  return <div>My Content</div>;
}
```

### Adding a New Component

```bash
touch components/MyComponent.tsx
```

```typescript
// components/MyComponent.tsx
interface MyComponentProps {
  title: string;
}

export function MyComponent({ title }: MyComponentProps) {
  return <div className="card">{title}</div>;
}
```

### Calling an API Endpoint

```typescript
import { streamsApi } from "@/lib/api-client";

const fetchStreams = async () => {
  try {
    const response = await streamsApi.getEmployeeStreams(walletAddress);
    console.log(response.data);
  } catch (error) {
    console.error("Failed to fetch:", error);
  }
};
```

### Using the Auth Store

```typescript
import { useAuthStore } from "@/lib/auth-store";

export default function MyComponent() {
  const { walletAddress, role, logout } = useAuthStore();

  return (
    <div>
      <p>Address: {walletAddress}</p>
      <p>Role: {role}</p>
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Creating a Custom Hook

```typescript
// lib/hooks/useMyData.ts
import { useState, useEffect } from "react";

export function useMyData(param: string) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch logic here
        setData(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [param]);

  return { data, loading, error };
}
```

## Smart Contract Integration (TODO)

### Step 1: Add Contract ABI
```typescript
// lib/contracts/Paystream.abi.ts
export const PAYSTREAM_ABI = [
  // Copy from contract artifacts
];
```

### Step 2: Create Contract Hook
```typescript
// lib/hooks/useStreamContract.ts
import { useWriteContract } from 'wagmi';

export function useCreateStream() {
  const { writeContract, isPending } = useWriteContract();

  const createStream = async (employee: string, amount: bigint, duration: bigint, escrowBps: number) => {
    return writeContract({
      address: PAYSTREAM_ADDRESS,
      abi: PAYSTREAM_ABI,
      functionName: 'createStream',
      args: [employee, amount, duration, escrowBps],
    });
  };

  return { createStream, isPending };
}
```

### Step 3: Use in Component
```typescript
import { useCreateStream } from "@/lib/hooks/useStreamContract";

export default function CreateStreamForm() {
  const { createStream, isPending } = useCreateStream();

  const handleSubmit = async () => {
    await createStream(employee, amount, duration, escrowBps);
  };

  return <button onClick={handleSubmit} disabled={isPending}>Create</button>;
}
```

## Styling Guide

### Tailwind Classes
```typescript
// Use predefined component classes
<button className="btn-primary">Submit</button>
<button className="btn-secondary">Cancel</button>
<button className="btn-danger">Delete</button>
<button className="btn-success">Approve</button>

<div className="card">Card content</div>
<input className="input-base" type="text" />
```

### Custom Styles
```css
/* app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer components {
  .my-custom-class {
    @apply p-4 bg-blue-50 rounded-lg border border-blue-200;
  }
}
```

## Debugging

### Browser Console
```typescript
// Add logging
console.log("Debug info:", value);
console.error("Error:", error);
console.warn("Warning:", issue);
```

### Next.js Dev Tools
- Open http://localhost:3000 in browser
- DevTools available with `npm run dev`
- Hot reload on file save

### API Debugging
```typescript
// Check API client interceptors in lib/api-client.ts
apiClient.interceptors.request.use((config) => {
  console.log("Request:", config);
  return config;
});
```

## Performance Tips

1. **Use "use client" selectively** - Only on interactive components
2. **Lazy load images** - Use Next.js Image component
3. **Optimize queries** - Cache data with React Query (future)
4. **Code splitting** - Next.js handles automatically
5. **Monitor bundle size** - Run `npm run build` regularly

## Testing

### Manual Testing Checklist
- [ ] Login with MetaMask
- [ ] Switch roles and verify sidebar updates
- [ ] Test form validation
- [ ] Test API error handling
- [ ] Test responsive design
- [ ] Test logout functionality

### Future: Automated Testing
```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e
```

## Environment Variables

| Variable | Purpose | Example |
|---|---|---|
| NEXT_PUBLIC_API_URL | Backend API endpoint | http://localhost:3001 |
| NEXT_PUBLIC_CHAIN_ID | Blockchain network | 11155111 (Sepolia) |
| NEXT_PUBLIC_CONTRACT_ADDRESS | Smart contract address | 0x... |
| NEXT_PUBLIC_RPC_URL | JSON-RPC endpoint | https://sepolia.infura.io/v3/... |
| NEXT_PUBLIC_IPFS_GATEWAY | IPFS gateway URL | https://gateway.pinata.cloud |

## Common Errors & Solutions

### "Cannot find module"
**Cause**: TypeScript path not configured
**Solution**: Check `tsconfig.json` baseUrl and paths

### "window is not defined"
**Cause**: Accessing window on server
**Solution**: Wrap in `useEffect` or check `typeof window !== 'undefined'`

### "API call fails"
**Cause**: Backend not running or wrong URL
**Solution**: Check `NEXT_PUBLIC_API_URL` and backend status

### "MetaMask not connecting"
**Cause**: Extension not installed or not on correct network
**Solution**: Install MetaMask, switch to Sepolia testnet

## Git Workflow

```bash
# Create a feature branch
git checkout -b feature/my-feature

# Make changes and commit
git add .
git commit -m "feat: add my feature"

# Push to GitHub
git push origin feature/my-feature

# Create pull request
```

## Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run start
```

### Deploy to Vercel
```bash
# Push to GitHub
git push origin main

# Vercel auto-deploys from main branch
```

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs)
- [ethers.js Documentation](https://docs.ethers.org/v6)
- [Zustand Documentation](https://github.com/pmndrs/zustand)

## Asking for Help

When you're stuck:
1. Check the console for error messages
2. Review similar code in the codebase
3. Search documentation
4. Check GitHub issues
5. Ask in community forums

---

Happy coding! 🚀
