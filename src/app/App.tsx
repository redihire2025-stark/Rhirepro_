import { RouterProvider } from 'react-router';
import { router } from './routes';
import { Toaster } from './components/ui/sonner';

export default function App() {
  return (
    <>
      <RouterProvider router={router} />
      {/*
        Mounted at the root rather than per-layout: the super admin layout was
        the only place with a Toaster, so toast() calls anywhere else silently
        did nothing.
      */}
      <Toaster position="top-right" richColors closeButton />
    </>
  );
}
