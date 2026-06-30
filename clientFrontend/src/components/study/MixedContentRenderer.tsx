// MixedContent.tsx
import { InlineMath, BlockMath } from "react-katex";
import Prism from "prismjs";
import "prismjs/components/prism-python";
import "prismjs/components/prism-javascript";
import { useEffect, useRef } from "react";

type Props = {
  text: string;
};

const CodeBlock = ({ code, language }: { code: string; language: string }) => {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (ref.current) Prism.highlightElement(ref.current);
  }, [code]);

  return (
    <pre style={{ background: "#0f172a", padding: "12px", borderRadius: "8px", overflowX: "auto" }}>
      <code ref={ref} className={`language-${language}`}>
        {code}
      </code>
    </pre>
  );
};

const detectLanguage = (code: string) => {
  if (code.includes("def ")) return "python";
  if (code.includes("function") || code.includes("=>")) return "javascript";
  return "javascript";
};

export const MixedContentRenderer = ({ text }: Props) => {
  if (!text) return null;

  // Split code blocks ```
  const codeSplit = text.split(/(```[\s\S]*?```)/g);

  return (
    <>
      {codeSplit.map((part, i) => {
        // CODE BLOCK
        if (part.startsWith("```") && part.endsWith("```")) {
          const content = part.slice(3, -3).trim();
          const firstLine = content.split("\n")[0];
          const langMatch = firstLine.match(/^[a-zA-Z]+$/);

          const language = langMatch ? firstLine : detectLanguage(content);
          const code = langMatch ? content.split("\n").slice(1).join("\n") : content;

          return <CodeBlock key={i} code={code} language={language} />;
        }

        // BLOCK MATH
        const blockParts = part.split(/(\$\$.*?\$\$)/g);

        return (
          <span key={i}>
            {blockParts.map((bp, j) => {
              if (bp.startsWith("$$") && bp.endsWith("$$")) {
                return <BlockMath key={j} math={bp.slice(2, -2)} />;
              }

              // INLINE MATH
              const inlineParts = bp.split(/(\$.*?\$)/g);

              return (
                <span key={j}>
                  {inlineParts.map((ip, k) => {
                    if (ip.startsWith("$") && ip.endsWith("$")) {
                      return <InlineMath key={k} math={ip.slice(1, -1)} />;
                    }
                    return <span key={k}>{ip}</span>;
                  })}
                </span>
              );
            })}
          </span>
        );
      })}
    </>
  );
};