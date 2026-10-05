'use client';

// MOBILE-03: collapses long text to a few lines with a "Read more" toggle.
// Short text (<= `threshold` characters) is shown in full with no toggle.

import { useState } from 'react';

export default function ReadMore({
  text,
  threshold = 220,
  className = '',
}: {
  text: string;
  threshold?: number;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > threshold;

  return (
    <div>
      <p
        className={`whitespace-pre-line ${className} ${
          isLong && !expanded ? 'line-clamp-4' : ''
        }`}
      >
        {text}
      </p>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="focus-ring mt-1.5 font-heading text-[13px] font-semibold text-orange"
        >
          {expanded ? 'Show less' : 'Read more'}
        </button>
      )}
    </div>
  );
}
