import Editor from "@/components/editor/Editor";
import { PageShell } from "@/components/SiteChrome";

export default function Home() {
  return (
    <PageShell active="banner">
      <h1 className="sr-only">Profilyze banner editor</h1>
      <Editor />
    </PageShell>
  );
}
