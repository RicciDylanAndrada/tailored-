export function parseLatex(content: string): string {
  // Remove LaTeX comments
  let text = content.replace(/%.*$/gm, '');

  // Remove common LaTeX preamble commands
  text = text.replace(/\\documentclass\{[^}]*\}/g, '');
  text = text.replace(/\\usepackage(\[[^\]]*\])?\{[^}]*\}/g, '');
  text = text.replace(/\\begin\{document\}/g, '');
  text = text.replace(/\\end\{document\}/g, '');

  // Extract section titles
  text = text.replace(/\\section\*?\{([^}]*)\}/g, '\n\n$1\n');
  text = text.replace(/\\subsection\*?\{([^}]*)\}/g, '\n$1\n');
  text = text.replace(/\\subsubsection\*?\{([^}]*)\}/g, '\n$1\n');

  // Handle common text formatting
  text = text.replace(/\\textbf\{([^}]*)\}/g, '$1');
  text = text.replace(/\\textit\{([^}]*)\}/g, '$1');
  text = text.replace(/\\emph\{([^}]*)\}/g, '$1');
  text = text.replace(/\\underline\{([^}]*)\}/g, '$1');

  // Handle links
  text = text.replace(/\\href\{[^}]*\}\{([^}]*)\}/g, '$1');
  text = text.replace(/\\url\{([^}]*)\}/g, '$1');

  // Handle lists
  text = text.replace(/\\begin\{itemize\}/g, '');
  text = text.replace(/\\end\{itemize\}/g, '');
  text = text.replace(/\\begin\{enumerate\}/g, '');
  text = text.replace(/\\end\{enumerate\}/g, '');
  text = text.replace(/\\item\s*/g, '• ');

  // Handle resume-specific commands
  text = text.replace(/\\resumeItem\{([^}]*)\}/g, '• $1');
  text = text.replace(/\\resumeSubheading\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}\{([^}]*)\}/g, '$1 - $3\n$2, $4');
  text = text.replace(/\\resumeProjectHeading\{([^}]*)\}\{([^}]*)\}/g, '$1 - $2');

  // Remove remaining LaTeX commands
  text = text.replace(/\\[a-zA-Z]+\*?(\[[^\]]*\])?(\{[^}]*\})?/g, '');

  // Remove special characters
  text = text.replace(/[{}\\]/g, '');

  // Clean up whitespace
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.trim();

  return text;
}
