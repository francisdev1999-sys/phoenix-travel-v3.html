'use client';
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, Bot, User, Lightbulb } from 'lucide-react';
import { theories, getRelatedTheories } from '@/lib/data/theories';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  suggestions?: string[];
}

const generateResponse = (query: string): { content: string; suggestions: string[] } => {
  const q = query.toLowerCase();
  const matchedTheory = theories.find(t =>
    q.includes(t.title.toLowerCase()) ||
    t.tags.some(tag => q.includes(tag.toLowerCase()))
  );

  if (matchedTheory) {
    const related = getRelatedTheories(matchedTheory.id).slice(0, 3);
    return {
      content: `**${matchedTheory.title}** — ${matchedTheory.category}\n\n${matchedTheory.overview}\n\n**Key claims (as proposed by proponents):**\n${matchedTheory.mainClaims.slice(0, 2).map(c => `• ${c}`).join('\n')}\n\n**Academic perspective:** ${matchedTheory.mainstreamPerspective.slice(0, 200)}...\n\n*This is presented as a theory, not established fact. Critical analysis is encouraged.*`,
      suggestions: related.map(t => `Tell me about ${t.title}`),
    };
  }

  if (q.includes('ancient') || q.includes('civilization')) {
    return {
      content: 'The archive contains extensive material on ancient civilizations — from Atlantis and Lemuria to the documented mysteries of Göbekli Tepe. These theories range from archaeological speculation to philosophical inquiries about the depth of pre-historical human capability. Which aspect interests you most?',
      suggestions: ['Tell me about Atlantis', 'Tell me about Gobekli Tepe', 'Tell me about ancient engineering'],
    };
  }

  if (q.includes('ufo') || q.includes('alien') || q.includes('extraterrestrial')) {
    return {
      content: 'The UFO/UAP section covers documented government programs, witness testimonies, and declassified reports. In 2017, the Pentagon\'s Advanced Aerospace Threat Identification Program was revealed, and subsequent Congressional hearings have featured former officials making extraordinary claims. The archive presents these as open questions awaiting resolution.',
      suggestions: ['Tell me about Roswell', 'Tell me about the Anunnaki', 'Tell me about ancient astronaut theories'],
    };
  }

  if (q.includes('simulation') || q.includes('reality') || q.includes('consciousness')) {
    return {
      content: 'Simulation Theory sits at the intersection of philosophy, physics, and computer science. Nick Bostrom\'s trilemma and James Gates\' discovery of error-correcting codes in physics equations represent serious academic inquiry into the computational nature of reality. This connects to broader questions about consciousness and the nature of existence.',
      suggestions: ['Tell me about Simulation Theory', 'What is the Stoned Ape Theory', 'Tell me about consciousness'],
    };
  }

  if (q.includes('connection') || q.includes('related') || q.includes('link')) {
    return {
      content: 'The Nexus Archive is built on the idea that these mysteries are interconnected. For example: The Book of Enoch describes the Watchers → who produced the Nephilim (giants) → whose legends appear globally → possibly connected to megalithic construction → which requires engineering knowledge → similar to that attributed to the Anunnaki. Every thread connects.',
      suggestions: ['Show me Book of Enoch connections', 'Tell me about the Nephilim', 'Tell me about Anunnaki'],
    };
  }

  const randomTheories = theories.sort(() => Math.random() - 0.5).slice(0, 3);
  return {
    content: 'Welcome to the Nexus Archive research assistant. I can help you explore theories, explain claims and criticisms, draw connections between topics, and suggest exploration paths. Ask me about any theory in the archive — ancient civilizations, UFOs, simulation theory, the Book of Enoch, secret societies, and much more. What would you like to investigate?',
    suggestions: randomTheories.map(t => `Tell me about ${t.title}`),
  };
};

const QUICK_PROMPTS = [
  'What are the most connected theories?',
  'Tell me about Atlantis',
  'How do the Anunnaki and Nephilim connect?',
  'What is Simulation Theory?',
  'Tell me about the Book of Enoch',
  'What mysteries surround the pyramids?',
];

export default function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: 'Welcome, researcher. I am the Nexus Archive research assistant. Ask me about any theory, historical mystery, or unexplained phenomenon. I will present all perspectives — claims, criticisms, and mainstream views — so you can form your own conclusions.\n\n*All content is presented as theories and open questions, not established facts.*',
      suggestions: QUICK_PROMPTS.slice(0, 3),
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    await new Promise(r => setTimeout(r, 800 + Math.random() * 600));

    const { content, suggestions } = generateResponse(text);
    const assistantMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content,
      suggestions,
    };

    setIsTyping(false);
    setMessages(prev => [...prev, assistantMsg]);
  };

  const formatContent = (content: string) => {
    return content.split('\n').map((line, i) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <div key={i} className="font-bold text-white mb-1">{line.slice(2, -2)}</div>;
      }
      if (line.startsWith('**') && line.includes('**')) {
        const parts = line.split('**');
        return <div key={i} className="mb-1">{parts.map((part, j) => j % 2 === 1 ? <strong key={j} className="text-white">{part}</strong> : <span key={j}>{part}</span>)}</div>;
      }
      if (line.startsWith('• ')) {
        return <div key={i} className="flex gap-2 mb-0.5"><span className="text-purple-400">•</span><span>{line.slice(2)}</span></div>;
      }
      if (line.startsWith('*') && line.endsWith('*')) {
        return <div key={i} className="text-slate-500 italic text-xs mt-1">{line.slice(1, -1)}</div>;
      }
      if (line === '') return <div key={i} className="h-2" />;
      return <div key={i}>{line}</div>;
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 p-4 border-b border-purple-900/20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-900/50 border border-purple-500/40 flex items-center justify-center">
            <Bot size={14} className="text-purple-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-white">Archive Research Assistant</div>
            <div className="flex items-center gap-1.5 text-xs text-green-400">
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Online
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <motion.div
            key={msg.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-purple-900/50 border border-purple-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Bot size={12} className="text-purple-400" />
              </div>
            )}
            <div className={`max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
              <div className={`rounded-xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-purple-700 text-white ml-auto'
                  : 'glass text-slate-300'
              }`}>
                {formatContent(msg.content)}
              </div>

              {msg.suggestions && msg.suggestions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {msg.suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(s)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-900/30 border border-purple-500/20 text-xs text-purple-300 hover:bg-purple-900/50 transition-colors"
                    >
                      <Lightbulb size={10} />
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {msg.role === 'user' && (
              <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <User size={12} className="text-slate-400" />
              </div>
            )}
          </motion.div>
        ))}

        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex gap-3"
            >
              <div className="w-7 h-7 rounded-full bg-purple-900/50 border border-purple-500/30 flex items-center justify-center">
                <Bot size={12} className="text-purple-400" />
              </div>
              <div className="glass rounded-xl px-4 py-3 flex gap-1.5 items-center">
                {[0, 1, 2].map(i => (
                  <motion.div
                    key={i}
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.1 }}
                    className="w-1.5 h-1.5 rounded-full bg-purple-400"
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      <div className="flex-shrink-0 px-4 py-2 border-t border-white/5">
        <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-hide">
          {QUICK_PROMPTS.map((p, i) => (
            <button
              key={i}
              onClick={() => sendMessage(p)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full bg-slate-900/50 border border-white/10 text-xs text-slate-400 hover:text-white hover:border-purple-500/30 transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-shrink-0 p-4 border-t border-purple-900/20">
        <form
          onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
          className="flex gap-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about any theory, mystery, or connection..."
            className="nexus-input text-sm"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="p-3 rounded-xl bg-purple-700 hover:bg-purple-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  );
}
