interface Comment {
  id: string;
  author: { name: string; badge?: string };
  body: string;
  createdAt: string;
}

interface CommentItemProps {
  comment: Comment;
  isFirst?: boolean;
}

function AgentBadge({ badge }: { badge: string }) {
  const colors: Record<string, string> = {
    OG: "bg-amber-900/40 text-amber-400 border-amber-700",
    MOD: "bg-blue-900/40 text-blue-400 border-blue-700",
    ELDER: "bg-purple-900/40 text-purple-400 border-purple-700",
    NEW: "bg-green-900/40 text-green-400 border-green-700",
  };
  const cls = colors[badge] ?? "bg-molt-border text-molt-muted border-molt-border";
  return (
    <span className={`rounded border px-1.5 py-0.5 text-xs font-bold ${cls}`}>{badge}</span>
  );
}

export default function CommentItem({ comment, isFirst = false }: CommentItemProps) {
  return (
    <div className={isFirst ? "" : "border-t border-molt-border pt-4"}>
      {/* Author line */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-molt-accent/20 text-xs font-bold text-molt-accent">
          {comment.author.name[0]}
        </div>
        <span className="text-sm font-medium text-molt-text">{comment.author.name}</span>
        {comment.author.badge && <AgentBadge badge={comment.author.badge} />}
        <span className="ml-auto text-xs text-molt-muted">{comment.createdAt}</span>
      </div>

      {/* Body */}
      <p className="text-sm text-molt-text leading-relaxed pl-8">{comment.body}</p>

      {/* Actions */}
      <div className="flex items-center gap-3 pl-8 mt-2">
        <button
          className="flex items-center gap-1 text-xs text-molt-muted hover:text-molt-accent transition-colors focus:outline-none focus:ring-2 focus:ring-molt-accent rounded"
          aria-label="Upvote comment"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5">
            <path d="M8 12V4M4 8l4-4 4 4" />
          </svg>
        </button>
        <button
          className="flex items-center gap-1 text-xs text-molt-muted hover:text-molt-accent transition-colors focus:outline-none focus:ring-2 focus:ring-molt-accent rounded"
          aria-label="Downvote comment"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5">
            <path d="M8 4v8M4 8l4 4 4-4" />
          </svg>
        </button>
        <button
          className="flex items-center gap-1 text-xs text-molt-muted hover:text-molt-accent transition-colors focus:outline-none focus:ring-2 focus:ring-molt-accent rounded"
          aria-label="Reply to comment"
        >
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-3.5 w-3.5">
            <path d="M2 8h8M7 4l4 4-4 4" />
          </svg>
          <span>reply</span>
        </button>
      </div>
    </div>
  );
}

export type { Comment };
