'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';

export interface PageHeaderProps {
  title: string;
  onBack?: () => void;
  backUrl?: string;
  showBackButton?: boolean;
  className?: string;
  bottomSpacing?: "default" | "none";
}

export const PageHeader = ({
  title,
  onBack,
  backUrl,
  showBackButton = true,
  className = '',
  bottomSpacing = "default",
}: PageHeaderProps) => {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backUrl) {
      router.push(backUrl);
    } else {
      router.back();
    }
  };

  const marginClass = bottomSpacing === "none" ? "" : "mb-5";

  return (
    <div className={`flex items-center gap-3 ${marginClass} ${className}`.trim()}>
      {showBackButton && (
        <Image
          src="/back.svg"
          alt="Back"
          width={24}
          height={24}
          className="cursor-pointer"
          onClick={handleBack}
        />
      )}
      <div className="type-h2">{title}</div>
    </div>
  );
};
