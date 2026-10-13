import React, { useState, useMemo } from 'react';
import {
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
  ArrowUpDown,
  Send,
  Sparkles,
} from 'lucide-react';
import { VideoComment } from '../../types';
import { mockComments } from '../../data/mockData';

interface CommentsSectionProps {
  videoId: string;
}

export const CommentsSection: React.FC<CommentsSectionProps> = ({ videoId }) => {
  // Initial comments for this video or fallback defaults
  const initialList = useMemo<VideoComment[]>(() => {
    return (
      mockComments[videoId] || [
        {
          id: 'comm-default-1',
          author: 'CyberNetRunner',
          authorAvatar:
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
          content: 'The production quality on this stream is unbelievable! That HUD overlay is insane.',
          timestamp: '2 hours ago',
          likes: 342,
        },
        {
          id: 'comm-default-2',
          author: 'VoidWalker',
          authorAvatar:
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
          content: 'Wait until you see the speedrun glitch at 03:45, literally broke the physics engine.',
          timestamp: '4 hours ago',
          likes: 128,
        },
      ]
    );
  }, [videoId]);

  const [comments, setComments] = useState<VideoComment[]>(initialList);
  const [newCommentText, setNewCommentText] = useState<string>('');
  const [sortBy, setSortBy] = useState<'top' | 'newest'>('top');
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState<string>('');
  const [likedCommentIds, setLikedCommentIds] = useState<Set<string>>(new Set());

  // Handle post new root comment
  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCommentText.trim();
    if (!trimmed) return;

    const newComment: VideoComment = {
      id: `comm-user-${Date.now()}`,
      author: 'You (CyberOp)',
      authorAvatar:
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      content: trimmed,
      timestamp: 'Just now',
      likes: 0,
      userLiked: false,
    };

    setComments((prev) => [newComment, ...prev]);
    setNewCommentText('');
  };

  // Handle toggle like on comment
  const handleToggleLikeComment = (commentId: string) => {
    setLikedCommentIds((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
  };

  // Handle reply submission
  const handlePostReply = (parentAuthor: string) => {
    const trimmed = replyText.trim();
    if (!trimmed) return;

    const newReply: VideoComment = {
      id: `comm-reply-${Date.now()}`,
      author: 'You (CyberOp)',
      authorAvatar:
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80',
      content: `@${parentAuthor} ${trimmed}`,
      timestamp: 'Just now',
      likes: 0,
      userLiked: false,
    };

    setComments((prev) => [newReply, ...prev]);
    setReplyingToId(null);
    setReplyText('');
  };

  // Sorted comments list
  const sortedComments = useMemo(() => {
    const list = [...comments];
    if (sortBy === 'top') {
      return list.sort((a, b) => {
        const aLikes = a.likes + (likedCommentIds.has(a.id) ? 1 : 0);
        const bLikes = b.likes + (likedCommentIds.has(b.id) ? 1 : 0);
        return bLikes - aLikes;
      });
    }
    // Newest first (user created ones have "Just now")
    return list;
  }, [comments, sortBy, likedCommentIds]);

  return (
    <div className="space-y-6 pt-4 font-sans text-slate-100">
      {/* Header with Comment Count & Sort Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-cyan-400" />
          <h2 className="text-base sm:text-lg font-bold tracking-tight">
            {comments.length} Comments
          </h2>
        </div>

        {/* Sort Button */}
        <div className="flex items-center gap-1.5 bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-cyan-500/20 text-xs font-mono">
          <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-400">Sort by:</span>
          <button
            onClick={() => setSortBy(sortBy === 'top' ? 'newest' : 'top')}
            className="text-cyan-300 font-bold hover:underline cursor-pointer uppercase"
          >
            {sortBy === 'top' ? 'Top Comments' : 'Newest First'}
          </button>
        </div>
      </div>

      {/* Add Comment Input Form */}
      <form onSubmit={handlePostComment} className="flex gap-3 items-start">
        <img
          src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&auto=format&fit=crop&q=80"
          alt="User Avatar"
          className="w-10 h-10 rounded-full object-cover border border-cyan-500/40 shadow-[0_0_8px_rgba(0,240,255,0.2)] shrink-0"
        />

        <div className="flex-1 space-y-2">
          <div className="relative">
            <textarea
              rows={2}
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Add a public comment to the broadcast..."
              className="w-full bg-slate-900/90 border border-cyan-500/30 rounded-xl p-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_12px_rgba(0,240,255,0.25)] transition resize-none"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              Markdown & chapter links supported
            </span>

            <div className="flex items-center gap-2">
              {newCommentText && (
                <button
                  type="button"
                  onClick={() => setNewCommentText('')}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono text-slate-400 hover:text-slate-200 transition cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={!newCommentText.trim()}
                className="px-4 py-1.5 rounded-xl bg-cyan-500 text-slate-950 hover:bg-cyan-400 text-xs font-mono font-bold tracking-wider disabled:opacity-40 transition cursor-pointer disabled:cursor-not-allowed shadow-[0_0_10px_rgba(0,240,255,0.3)] flex items-center gap-1.5"
              >
                <Send className="w-3 h-3" />
                Comment
              </button>
            </div>
          </div>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-4 pt-2">
        {sortedComments.map((comment) => {
          const isLiked = likedCommentIds.has(comment.id);
          const currentLikes = comment.likes + (isLiked ? 1 : 0);
          const isReplying = replyingToId === comment.id;

          return (
            <div
              key={comment.id}
              className="flex gap-3 p-3 rounded-xl bg-[#0a0e17]/60 hover:bg-[#0a0e17]/90 border border-transparent hover:border-cyan-500/20 transition-all duration-150"
            >
              <img
                src={comment.authorAvatar}
                alt={comment.author}
                className="w-9 h-9 rounded-full object-cover border border-cyan-500/30 shrink-0 mt-0.5"
              />

              <div className="flex-1 space-y-1.5">
                {/* Author & Timestamp */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-200 hover:text-cyan-300 transition cursor-pointer">
                    {comment.author}
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    {comment.timestamp}
                  </span>
                </div>

                {/* Comment Text */}
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans break-words">
                  {comment.content}
                </p>

                {/* Comment Actions: Like, Dislike, Reply */}
                <div className="flex items-center gap-4 pt-1 text-xs font-mono">
                  {/* Like */}
                  <button
                    onClick={() => handleToggleLikeComment(comment.id)}
                    className={`flex items-center gap-1.5 transition cursor-pointer ${
                      isLiked ? 'text-cyan-400 font-bold' : 'text-slate-400 hover:text-cyan-300'
                    }`}
                  >
                    <ThumbsUp className={`w-3.5 h-3.5 ${isLiked ? 'fill-cyan-400' : ''}`} />
                    <span>{currentLikes > 0 ? currentLikes : ''}</span>
                  </button>

                  {/* Dislike */}
                  <button
                    title="Dislike"
                    className="text-slate-400 hover:text-red-400 transition cursor-pointer"
                  >
                    <ThumbsDown className="w-3.5 h-3.5" />
                  </button>

                  {/* Reply */}
                  <button
                    onClick={() => setReplyingToId(isReplying ? null : comment.id)}
                    className="text-slate-400 hover:text-cyan-300 font-semibold transition cursor-pointer"
                  >
                    {isReplying ? 'Cancel' : 'Reply'}
                  </button>
                </div>

                {/* Nested Reply Box */}
                {isReplying && (
                  <div className="pt-2 flex gap-2 items-center">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`Reply to @${comment.author}...`}
                      className="flex-1 bg-slate-900 border border-cyan-500/30 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                    <button
                      onClick={() => handlePostReply(comment.author)}
                      disabled={!replyText.trim()}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-400 hover:text-slate-950 font-mono text-xs font-bold disabled:opacity-40 transition cursor-pointer"
                    >
                      Reply
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
