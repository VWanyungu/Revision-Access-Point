import { BlockMath } from "react-katex";
import Prism from "prismjs";
import "prismjs/components/prism-python";
import "prismjs/components/prism-javascript";
import { useEffect, useRef } from "react";

type Step = {
  text: string;
  latex?: string;
  code?: string;
  language?: string;
};

export const StepRenderer = ({ step }: { step: Step }) => {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      Prism.highlightElement(codeRef.current);
    }
  }, [step.code]);

  return (
    <div style={{ marginBottom: "1rem" }}>
      {/* Text */}
      {step.text && <p>{step.text}</p>}

      {/* Math */}
      {step.latex && (
        <div style={{ margin: "0.5rem 0" }}>
          <BlockMath math={step.latex} />
        </div>
      )}

      {/* Code */}
      {step.code && (
        <pre style={{ background: "#0f172a", padding: "12px", borderRadius: "8px", overflowX: "auto" }}>
          <code ref={codeRef} className={`language-${step.language || "javascript"}`}>
            {step.code}
          </code>
        </pre>
      )}
    </div>
  );
};