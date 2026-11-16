export type LanguageId =
  | "python" | "javascript" | "typescript" | "java" | "cpp" | "c" | "go" | "csharp" | "ruby" | "rust";

export const LANGUAGES: { id: LanguageId; label: string; monaco: string; judge0: number; starter: string }[] = [
  { id: "python", label: "Python 3", monaco: "python", judge0: 71, starter: "def solve():\n    data = input()\n    print(data)\n\nsolve()\n" },
  { id: "javascript", label: "JavaScript", monaco: "javascript", judge0: 63, starter: "const lines = require('fs').readFileSync(0, 'utf8').trim().split('\\n');\nconsole.log(lines[0]);\n" },
  { id: "typescript", label: "TypeScript", monaco: "typescript", judge0: 74, starter: "const lines: string[] = require('fs').readFileSync(0, 'utf8').trim().split('\\n');\nconsole.log(lines[0]);\n" },
  { id: "java", label: "Java", monaco: "java", judge0: 62, starter: "import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        System.out.println(sc.nextLine());\n    }\n}\n" },
  { id: "cpp", label: "C++", monaco: "cpp", judge0: 54, starter: "#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    string s;\n    getline(cin, s);\n    cout << s << endl;\n}\n" },
  { id: "c", label: "C", monaco: "c", judge0: 50, starter: "#include <stdio.h>\n\nint main() {\n    char s[1024];\n    fgets(s, 1024, stdin);\n    printf(\"%s\", s);\n}\n" },
  { id: "go", label: "Go", monaco: "go", judge0: 60, starter: "package main\n\nimport (\n\t\"bufio\"\n\t\"fmt\"\n\t\"os\"\n)\n\nfunc main() {\n\tr := bufio.NewScanner(os.Stdin)\n\tr.Scan()\n\tfmt.Println(r.Text())\n}\n" },
  { id: "csharp", label: "C#", monaco: "csharp", judge0: 51, starter: "using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine(Console.ReadLine());\n    }\n}\n" },
  { id: "ruby", label: "Ruby", monaco: "ruby", judge0: 72, starter: "puts gets\n" },
  { id: "rust", label: "Rust", monaco: "rust", judge0: 73, starter: "use std::io;\n\nfn main() {\n    let mut s = String::new();\n    io::stdin().read_line(&mut s).unwrap();\n    println!(\"{}\", s.trim());\n}\n" },
];

export function getLanguage(id: string) {
  return LANGUAGES.find((l) => l.id === id) ?? LANGUAGES[0];
}
