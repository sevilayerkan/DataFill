import Link from "next/link";

export default function NotFound() {
  return (
    <div className="w-full max-w-3xl px-4 py-16 text-center sm:px-6">
      <p className="text-sm font-medium text-muted-foreground">404</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight">
        Page not found
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
        This page does not exist. FadelyText&apos;s text tools and fake data
        generators are on the homepage.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Back to FadelyText
      </Link>
    </div>
  );
}
