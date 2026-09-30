"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, ChevronDown, ChevronRight, ChevronUp, Circle, Lightbulb, ListChecks, Sigma, Sparkles } from "lucide-react";
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

const curriculumCache = new Map<
  string,
  { data: CurriculumData; expiresAt: number }
>();
const curriculumRequests = new Map<string, Promise<CurriculumData>>();
const CURRICULUM_CACHE_TTL = 60_000;
const pendingCurriculumScroll = new Map<
  string,
  { destinationCode: string; pageY: number; topicListY: number }
>();

function getCachedCurriculumData(
  id: string,
  subsectionCode: string,
): CurriculumData | null {
  const path = `/api/curriculum/${encodeURIComponent(id)}/${encodeURIComponent(subsectionCode)}`;
  const cached = curriculumCache.get(path);
  if (!cached) return null;
  if (cached.expiresAt <= Date.now()) {
    curriculumCache.delete(path);
    return null;
  }
  return cached.data;
}

function fetchCurriculumData(
  fetcher: typeof fetch,
  id: string,
  subsectionCode: string,
): Promise<CurriculumData> {
  const path = `/api/curriculum/${encodeURIComponent(id)}/${encodeURIComponent(subsectionCode)}`;
  const cached = curriculumCache.get(path);
  if (cached && cached.expiresAt > Date.now()) {
    return Promise.resolve(cached.data);
  }
  if (cached) curriculumCache.delete(path);

  const existingRequest = curriculumRequests.get(path);
  if (existingRequest) return existingRequest;

  const request = (async () => {
    const response = await fetcher(path, { method: "GET", cache: "no-store" });
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

    curriculumCache.set(path, {
      data: result,
      expiresAt: Date.now() + CURRICULUM_CACHE_TTL,
    });
    return result;
  })().finally(() => curriculumRequests.delete(path));

  curriculumRequests.set(path, request);
  return request;
}

function CurriculumContent() {
  const { id, subsectionCode } = useParams<{ id: string; subsectionCode: string }>();
  const { fetch: authenticatedFetch } = useAuth();
  const initialData = getCachedCurriculumData(id, subsectionCode);
  const [data, setData] = useState<CurriculumData | null>(initialData);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!initialData);
  const [retry, setRetry] = useState(0);
  const topicListRef = useRef<HTMLDivElement>(null);
  const mobileTopicListRef = useRef<HTMLDivElement>(null);
  const [mobileTopicsOpen, setMobileTopicsOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);
      const cached = getCachedCurriculumData(id, subsectionCode);
      if (cached) {
        setData(cached);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const result = await fetchCurriculumData(
          authenticatedFetch,
          id,
          subsectionCode,
        );
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

  useEffect(() => {
    if (loading || data?.selectedSubsection.code !== subsectionCode) return;
    const saved = pendingCurriculumScroll.get(id);
    if (!saved || saved.destinationCode !== subsectionCode) return;

    window.scrollTo(0, saved.pageY);
    if (topicListRef.current) topicListRef.current.scrollTop = saved.topicListY;
    if (mobileTopicListRef.current) mobileTopicListRef.current.scrollTop = saved.topicListY;
    pendingCurriculumScroll.delete(id);
  }, [data, id, loading, subsectionCode]);

  useEffect(() => {
    if (!data) return;

    let cancelled = false;
    const curriculumId = data.id;
    const subsectionCodes = Array.from(
      new Set(
        data.sections.flatMap((section) =>
          section.subsections.map((item) => item.code),
        ),
      ),
    );

    async function prefetchAllTopics() {
      for (let index = 0; index < subsectionCodes.length; index += 3) {
        await Promise.allSettled(
          subsectionCodes
            .slice(index, index + 3)
            .map((code) =>
              fetchCurriculumData(authenticatedFetch, curriculumId, code),
            ),
        );
        if (cancelled) return;
      }
    }

    void prefetchAllTopics();
    return () => {
      cancelled = true;
    };
  }, [authenticatedFetch, data]);

  if (loading && !data) {
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
  const saveCurriculumScroll = (destinationCode: string) => {
    pendingCurriculumScroll.set(data.id, {
      destinationCode,
      pageY: window.scrollY,
      topicListY:
        mobileTopicListRef.current?.scrollTop ?? topicListRef.current?.scrollTop ?? 0,
    });
  };
  const tutorHref = (outcomeCode: string, action: "anlat" | "soru" | "test") => {
    return `/?${new URLSearchParams({ assistantId: "math-tutor", outcomeCode, outcomeAction: action })}`;
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
          <div><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{data.title}</h1></div>
        </section>

        <div className="mb-8 lg:hidden">
          <Button
            type="button"
            variant="outline"
            className="w-full justify-between"
            aria-expanded={mobileTopicsOpen}
            aria-controls="mobile-topic-list"
            onClick={() => setMobileTopicsOpen((open) => !open)}
          >
            <span className="flex min-w-0 items-center gap-2">
              <BookOpen className="size-4 shrink-0" />
              <span>Konular</span>
              <span className="truncate text-muted-foreground">{subsection.title}</span>
            </span>
            {mobileTopicsOpen ? <ChevronUp /> : <ChevronDown />}
          </Button>
          {mobileTopicsOpen && (
            <div
              id="mobile-topic-list"
              ref={mobileTopicListRef}
              className="mt-2 max-h-[55vh] space-y-4 overflow-y-auto overscroll-contain rounded-md border bg-background p-3"
            >
              {data.sections.map((section) => (
                <section key={section.id}>
                  <h2 className="mb-2 text-sm font-semibold">{section.code} · {section.title}</h2>
                  <div className="space-y-1 border-l pl-3">
                    {section.subsections.map((item) => (
                      <Link
                        key={item.id}
                        href={subsectionHref(item.code)}
                        scroll={false}
                        onClick={() => saveCurriculumScroll(item.code)}
                        aria-current={item.code === subsection.code ? "page" : undefined}
                        className={`block rounded-md px-3 py-2 text-sm transition-colors ${item.code === subsection.code ? "bg-muted font-medium" : "hover:bg-muted"}`}
                      >
                        <span className="mr-2 text-muted-foreground">{item.code}</span>
                        {item.title}
                      </Link>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          <aside className="hidden lg:block">
            <div ref={topicListRef} className="sticky top-24 h-[calc(100vh-6rem)] space-y-5 overflow-y-auto overscroll-contain pr-2">
              <p className="text-muted-foreground px-2 text-xs font-semibold uppercase tracking-wider">Konular</p>
              {data.sections.map((section) => (
                <section key={section.id}>
                  <div className="flex items-center gap-3 rounded-md bg-primary px-3 py-3 text-primary-foreground">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded bg-primary-foreground/15 text-xs font-bold">{section.code}</span>
                    <div className="min-w-0"><p className="text-sm font-semibold">{section.title}</p><p className="mt-0.5 text-xs opacity-75">{section.subsections.length} alt konu</p></div>
                  </div>
                  <div className="ml-4 border-l pl-3">
                    {section.subsections.map((item) => (
                      <Link key={item.id} href={subsectionHref(item.code)} scroll={false} onClick={() => saveCurriculumScroll(item.code)} aria-current={item.code === subsection.code ? "page" : undefined} className={`hover:bg-muted block rounded-md px-3 py-2.5 transition-colors ${item.code === subsection.code ? "bg-muted" : ""}`}>
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
              <div><h2 className="mt-1 text-2xl font-bold tracking-tight">{subsection.title}</h2></div>
            </div>

            <div className="mx-auto mb-8 grid w-full max-w-3xl gap-3 sm:grid-cols-3">
              <Stat icon={<BookOpen />} value={subsection.learningOutcomes.length} label="Kazanım" />
              <Stat icon={<Lightbulb />} value={subsection.concepts.length} label="Kavram" />
              <Stat icon={<Sigma />} value={subsection.symbols.length} label="Sembol" />
            </div>

            <div className="space-y-4">
              {subsection.learningOutcomes.map((outcome) => (
                <Card key={outcome.id} className="overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                      <div className="text-muted-foreground mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border bg-muted/50"><Circle className="size-5" /></div>
                      <div className="min-w-0 flex-1">
                        <span className="inline-flex rounded-md bg-secondary px-2.5 py-1 text-xs font-medium">{outcome.code}</span>
                        <CardTitle className="mt-3 text-base leading-7 sm:text-lg">{outcome.description}</CardTitle>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Button asChild size="sm" variant="outline">
                          <Link href={tutorHref(outcome.code, "anlat")}><Sparkles />Konuyu anlat</Link>
                        </Button>
                        <Button asChild size="sm" variant="outline">
                          <Link href={tutorHref(outcome.code, "soru")}><Sigma />Soru iste</Link>
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {outcome.notes.length > 0 && (
                    <CardContent className="pl-[72px]">
                      <div className="rounded-md border bg-muted/30 p-4">
                        <div className="mb-2 flex items-center gap-2"><Lightbulb className="text-primary size-4" /><span className="text-sm font-semibold">Öğretim notları</span></div>
                        <ul className="space-y-2">{outcome.notes.map((note) => <li key={note.id} className="leading-6">{note.content}</li>)}</ul>
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))}
              {subsection.learningOutcomes.length === 0 && <p className="text-muted-foreground border-y py-8 text-center text-sm">Bu alt konu için henüz kazanım eklenmemiş.</p>}
            </div>

            <Card className="mt-8">
              <CardHeader><CardTitle className="text-lg">Bu konuda neler var?</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <p className="mb-3 text-sm font-semibold">Temel kavramlar</p>
                  {subsection.concepts.length ? <div className="flex flex-wrap gap-2">{subsection.concepts.map((concept) => <span key={concept.id} className="rounded-md border px-3 py-1.5 text-sm">{concept.name}</span>)}</div> : null}
                </div>
                <div className="border-t pt-5">
                  <p className="mb-3 text-sm font-semibold">Semboller ve gösterimler</p>
                  {subsection.symbols.length ? <div className="flex flex-wrap gap-2">{subsection.symbols.map((symbol) => <span key={symbol.id} title={symbol.description ?? undefined} className="min-w-10 rounded-md bg-secondary px-3 py-1.5 text-center font-mono text-sm">{symbol.symbol}</span>)}</div> : null}
                </div>
              </CardContent>
            </Card>

            <nav aria-label="Alt konu gezinmesi" className="mt-8 flex justify-between gap-3">
              {previous ? <Button asChild variant="outline"><Link href={subsectionHref(previous.code)}><ArrowLeft /><span className="hidden sm:inline">{previous.title}</span><span className="sm:hidden">Önceki</span></Link></Button> : <span />}
              {next && <Button asChild variant="outline" className="ml-auto"><Link href={subsectionHref(next.code)}><span className="hidden sm:inline">{next.title}</span><span className="sm:hidden">Sonraki</span><ArrowRight /></Link></Button>}
            </nav>

            <div className="mt-8 flex justify-center border-t pt-8">
              <Button asChild variant="outline">
                <Link href={tutorHref(subsection.code, "test")}><ListChecks />Genel tarama</Link>
              </Button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Stat({ icon, value, label }: { icon: ReactNode; value: number; label: string }) {
  return <Card className="gap-0 py-2"><CardContent className="flex items-center gap-3 p-2"><div className="text-primary flex size-10 items-center justify-center rounded-md bg-primary/10">{icon}</div><div><p className="text-2xl font-bold">{value}</p><p className="text-muted-foreground text-xs">{label}</p></div></CardContent></Card>;
}

export default function CurriculumPage() {
  return <><Toaster /><AuthProvider><CurriculumContent /></AuthProvider></>;
}