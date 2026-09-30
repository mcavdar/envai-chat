"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, ChevronRight, Circle, Lightbulb, Sigma, Sparkles } from "lucide-react";
import { AuthProvider, useAuth } from "@/providers/Auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Toaster } from "@/components/ui/sonner";

type Outcome = {
  id: string;
  code: string;
  description: string;
  notes: { id: string; content: string; sortOrder: number }[];
};

type SubsectionLink = { id: string; code: string; title: string; outcomesCount?: number };
type Section = { id: string; code: string; title: string; subsections: SubsectionLink[] };
type CurriculumData = {
  id: string;
  title: string;
  subject: { id: string; name: string };
  grade: { id: string; level: number; name: string };
  sections: Section[];
  selectedSubsection: {
    id: string;
    code: string;
    title: string;
    section: { id: string; code: string; title: string };
    concepts: { id: string; name: string }[];
    symbols: { id: string; symbol: string; description: string | null }[];
    learningOutcomes: Outcome[];
  };
};

function CurriculumContent() {
  const { id, subsectionCode } = useParams<{ id: string; subsectionCode: string }>();
  const { fetch: authenticatedFetch } = useAuth();
  const [data, setData] = useState<CurriculumData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await authenticatedFetch(
          `/api/curriculum/${encodeURIComponent(id)}/${encodeURIComponent(subsectionCode)}`,
          { method: "GET", cache: "no-store" },
        );
        if (response.status === 404) throw new Error("Müfredat veya alt konu bulunamadı.");
        if (!response.ok) throw new Error("Müfredat yüklenemedi.");

        const result = (await response.json()) as CurriculumData;
        if (
          !result?.subject ||
          !result.grade ||
          !Array.isArray(result.sections) ||
          result.selectedSubsection?.code !== subsectionCode
        ) {
          throw new Error("Sunucudan geçersiz müfredat verisi alındı.");
        }
        if (!cancelled) setData(result);
      } catch (loadError) {
        if (!cancelled) {
          setData(null);
          setError(loadError instanceof Error ? loadError.message : "Müfredat yüklenemedi.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [authenticatedFetch, id, subsectionCode, retry]);

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center px-6"><p className="text-muted-foreground">Müfredat yükleniyor...</p></main>;
  }
  if (error || !data) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p role="alert" className="text-muted-foreground">{error ?? "Müfredat yüklenemedi."}</p>
        <Button variant="outline" onClick={() => setRetry((value) => value + 1)}>Tekrar dene</Button>
      </main>
    );
  }

  const subsection = data.selectedSubsection;
  const activeSection = subsection.section;
  const ordered = data.sections.flatMap((section) =>
    section.subsections.map((item) => ({ ...item, section })),
  );
  const activeIndex = ordered.findIndex((item) => item.code === subsection.code);
  const previous = activeIndex > 0 ? ordered[activeIndex - 1] : null;
  const next = activeIndex >= 0 && activeIndex < ordered.length - 1 ? ordered[activeIndex + 1] : null;
  const subsectionHref = (code: string) => `/curriculum/${encodeURIComponent(data.id)}/${encodeURIComponent(code)}`;
  const tutorHref = (outcome: Outcome) => {
    return `/?${new URLSearchParams({ assistantId: "math-tutor", outcomeCode: outcome.code })}`;
  };

  return (
    <main className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
          <Button asChild variant="ghost" size="icon" aria-label="Sohbete dön">
            <Link href="/"><ArrowLeft /></Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground"><BookOpen className="size-5" /></div>
            <div><p className="text-sm font-semibold">{data.subject.name}</p><p className="text-muted-foreground text-xs">{data.grade.name}</p></div>
          </div>
          <span className="text-muted-foreground ml-auto text-sm">Müfredat</span>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <nav aria-label="İçerik yolu" className="text-muted-foreground mb-6 flex flex-wrap items-center gap-2 text-sm">
          <span>{data.grade.name}</span><ChevronRight className="size-4" /><span>{data.subject.name}</span>
          {activeSection && <><ChevronRight className="size-4" /><span className="text-foreground font-medium">{activeSection.title}</span></>}
        </nav>

        <section className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div><p className="text-primary text-sm font-semibold">{data.grade.level}. Sınıf · {data.subject.name}</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{data.title}</h1></div>
          <p className="text-muted-foreground text-sm">{subsection.learningOutcomes.length} kazanım</p>
        </section>

        <div className="mb-8 flex gap-2 overflow-x-auto pb-2 lg:hidden">
          {data.sections.flatMap((section) => section.subsections.map((item) => (
            <Button key={item.id} asChild size="sm" variant={item.code === subsection.code ? "default" : "outline"} className="shrink-0">
              <Link href={subsectionHref(item.code)}>{item.code} · {item.title}</Link>
            </Button>
          )))}
        </div>

        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-5">
              <p className="text-muted-foreground px-2 text-xs font-semibold uppercase tracking-wider">Konular</p>
              {data.sections.map((section) => (
                <section key={section.id}>
                  <div className="flex items-center gap-3 rounded-md bg-primary px-3 py-3 text-primary-foreground">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded bg-primary-foreground/15 text-xs font-bold">{section.code}</span>
                    <div className="min-w-0"><p className="text-sm font-semibold">{section.title}</p><p className="mt-0.5 text-xs opacity-75">{section.subsections.length} alt konu</p></div>
                  </div>
                  <div className="ml-4 border-l pl-3">
                    {section.subsections.map((item) => (
                      <Link key={item.id} href={subsectionHref(item.code)} aria-current={item.code === subsection.code ? "page" : undefined} className={`hover:bg-muted block rounded-md px-3 py-2.5 transition-colors ${item.code === subsection.code ? "bg-muted" : ""}`}>
                        <span className="text-muted-foreground block text-xs">{item.code}</span><span className="mt-0.5 block text-sm font-medium">{item.title}</span>{item.outcomesCount !== undefined && <span className="text-muted-foreground mt-1 block text-xs">{item.outcomesCount} kazanım</span>}
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </aside>

          <section className="min-w-0">
            <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div><p className="text-primary text-sm font-medium">{subsection.code}</p><h2 className="mt-1 text-2xl font-bold tracking-tight">{subsection.title}</h2></div>
              <p className="text-muted-foreground text-sm">{subsection.learningOutcomes.length} kazanım</p>
            </div>

            <div className="mb-8 grid gap-3 sm:grid-cols-3">
              <Stat icon={<BookOpen />} value={subsection.learningOutcomes.length} label="Kazanım" />
              <Stat icon={<Lightbulb />} value={subsection.concepts.length} label="Kavram" />
              <Stat icon={<Sigma />} value={subsection.symbols.length} label="Sembol" />
            </div>

            <div className="space-y-4">
              {subsection.learningOutcomes.map((outcome) => (
                <Card key={outcome.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start gap-4">
                      <div className="text-muted-foreground mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border bg-muted/50"><Circle className="size-5" /></div>
                      <div className="min-w-0 flex-1">
                        <span className="inline-flex rounded-md bg-secondary px-2.5 py-1 text-xs font-medium">{outcome.code}</span>
                        <CardTitle className="mt-3 text-base leading-7 sm:text-lg">{outcome.description}</CardTitle>
                      </div>
                      <Button asChild size="sm" variant="outline" className="shrink-0">
                        <Link href={tutorHref(outcome)}><Sparkles />Konuyu açıkla</Link>
                      </Button>
                    </div>
                  </CardHeader>
                  {outcome.notes.length > 0 && (
                    <CardContent className="pl-[72px]">
                      <div className="rounded-md border bg-muted/30 p-4">
                        <div className="mb-2 flex items-center gap-2"><Lightbulb className="text-primary size-4" /><span className="text-sm font-semibold">Öğretim notları</span></div>
                        <ul className="space-y-2">{outcome.notes.map((note) => <li key={note.id} className="text-muted-foreground text-sm leading-6">{note.content}</li>)}</ul>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
              {subsection.learningOutcomes.length === 0 && <p className="text-muted-foreground border-y py-8 text-center text-sm">Bu alt konu için henüz kazanım eklenmemiş.</p>}
            </div>

            <Card className="mt-8">
              <CardHeader><CardTitle className="text-lg">Bu konuda neler var?</CardTitle><p className="text-muted-foreground text-sm">Temel kavram ve semboller.</p></CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className="mb-3 text-sm font-semibold">Temel kavramlar</p>
                  {subsection.concepts.length ? <div className="flex flex-wrap gap-2">{subsection.concepts.map((concept) => <span key={concept.id} className="rounded-md border px-3 py-1.5 text-sm">{concept.name}</span>)}</div> : <p className="text-muted-foreground text-sm">Kavram eklenmemiş.</p>}
                </div>
                <div className="border-t pt-5">
                  <p className="mb-3 text-sm font-semibold">Semboller ve gösterimler</p>
                  {subsection.symbols.length ? <div className="flex flex-wrap gap-2">{subsection.symbols.map((symbol) => <span key={symbol.id} title={symbol.description ?? undefined} className="min-w-10 rounded-md bg-secondary px-3 py-1.5 text-center font-mono text-sm">{symbol.symbol}</span>)}</div> : <p className="text-muted-foreground text-sm">Sembol eklenmemiş.</p>}
                </div>
              </CardContent>
            </Card>

            <nav aria-label="Alt konu gezinmesi" className="mt-8 flex justify-between gap-3">
              {previous ? <Button asChild variant="outline"><Link href={subsectionHref(previous.code)}><ArrowLeft /><span className="hidden sm:inline">{previous.title}</span><span className="sm:hidden">Önceki</span></Link></Button> : <span />}
              {next && <Button asChild variant="outline" className="ml-auto"><Link href={subsectionHref(next.code)}><span className="hidden sm:inline">{next.title}</span><span className="sm:hidden">Sonraki</span><ArrowRight /></Link></Button>}
            </nav>
          </section>
        </div>
      </div>
    </main>
  );
}

function Stat({ icon, value, label }: { icon: ReactNode; value: number; label: string }) {
  return <Card><CardContent className="flex items-center gap-3 p-4"><div className="text-primary flex size-10 items-center justify-center rounded-md bg-primary/10">{icon}</div><div><p className="text-2xl font-bold">{value}</p><p className="text-muted-foreground text-xs">{label}</p></div></CardContent></Card>;
}

export default function CurriculumPage() {
  return <><Toaster /><AuthProvider><CurriculumContent /></AuthProvider></>;
}