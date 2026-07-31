import type { SVGProps } from "react";

function IconBase(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      height="20"
      viewBox="0 0 24 24"
      width="20"
      {...props}
    />
  );
}

export function LogoMark() {
  return (
    <svg aria-hidden="true" className="logo-mark" viewBox="0 0 44 32">
      <path d="M12 4 3 16l9 12" />
      <path d="m32 4 9 12-9 12" />
      <path d="M25 2 18 30" />
    </svg>
  );
}

export function EyeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="2.6" stroke="currentColor" strokeWidth="1.8" />
    </IconBase>
  );
}

export function BulbIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M8.5 17h7M9 20h6M8.6 14.5C7 13.4 6 11.6 6 9.5a6 6 0 1 1 12 0c0 2.1-1 3.9-2.6 5-.8.6-1.1 1.1-1.1 2H9.7c0-.9-.3-1.4-1.1-2Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </IconBase>
  );
}

export function RefreshIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M20 6v5h-5M4 18v-5h5M6.1 9a7 7 0 0 1 11.5-2.3L20 9M4 15l2.4 2.3A7 7 0 0 0 18 15" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </IconBase>
  );
}

export function PlayIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="m9 7 8 5-8 5V7Z" fill="currentColor" />
    </IconBase>
  );
}

export function PauseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M8 7h3v10H8zM13 7h3v10h-3z" fill="currentColor" />
    </IconBase>
  );
}

export function ArrowIcon({ direction, ...props }: SVGProps<SVGSVGElement> & { direction: "left" | "right" }) {
  return (
    <IconBase {...props}>
      <path d={direction === "left" ? "m14.5 6-6 6 6 6" : "m9.5 6 6 6-6 6"} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </IconBase>
  );
}

export function ExternalIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M14 4h6v6M20 4l-9 9M18 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </IconBase>
  );
}

export function QuestionIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.7" />
      <path d="M9.8 9.2a2.4 2.4 0 0 1 4.6.9c0 1.9-2.4 2.1-2.4 3.8M12 17.3h.01" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </IconBase>
  );
}

export function ExampleIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M6 4.5h9l3 3V19a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5.5a1 1 0 0 1 1-1Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" />
      <path d="M14.5 4.5V8H18M8 11h7M8 14h7M8 17h4" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
    </IconBase>
  );
}

export function PatternIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <rect height="5" rx="1.2" stroke="currentColor" strokeWidth="1.7" width="5" x="4" y="4" />
      <rect height="5" rx="1.2" stroke="currentColor" strokeWidth="1.7" width="5" x="15" y="4" />
      <rect height="5" rx="1.2" stroke="currentColor" strokeWidth="1.7" width="5" x="9.5" y="15" />
      <path d="m8 9 3 6M16 9l-3 6" stroke="currentColor" strokeWidth="1.7" />
    </IconBase>
  );
}

export function SparkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M12 2.8c.7 4.4 2.8 6.5 7.2 7.2-4.4.7-6.5 2.8-7.2 7.2-.7-4.4-2.8-6.5-7.2-7.2 4.4-.7 6.5-2.8 7.2-7.2Z" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.7" />
      <path d="M19 16.5c.3 1.6 1.1 2.4 2.7 2.7-1.6.3-2.4 1.1-2.7 2.7-.3-1.6-1.1-2.4-2.7-2.7 1.6-.3 2.4-1.1 2.7-2.7Z" fill="currentColor" />
    </IconBase>
  );
}

export function LockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <rect height="10" rx="2" stroke="currentColor" strokeWidth="1.7" width="14" x="5" y="10" />
      <path d="M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10" stroke="currentColor" strokeLinecap="round" strokeWidth="1.7" />
    </IconBase>
  );
}

export function CodeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="m8.5 7-5 5 5 5M15.5 7l5 5-5 5M13.5 4l-3 16" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </IconBase>
  );
}
