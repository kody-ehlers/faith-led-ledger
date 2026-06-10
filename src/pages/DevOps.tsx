import { Dispatch, SetStateAction, useEffect, useState } from "react";
import { useFinanceStore } from "@/store/financeStore";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Bug, Sparkles } from "lucide-react";

interface IssueItem {
    id: string;
    text: string;
    complete: boolean;
    createdAt: string;
    completedAt?: string | null;
}

const BUGS_STORAGE_KEY = "finance-known-bugs";
const FEATURES_STORAGE_KEY = "finance-feature-requests";

export default function DevOps() {
    const [bugs, setBugs] = useState<IssueItem[]>(() => {
        try {
            const raw = localStorage.getItem(BUGS_STORAGE_KEY);
            return raw ? (JSON.parse(raw) as IssueItem[]) : [];
        } catch {
            return [];
        }
    });
    const [requests, setRequests] = useState<IssueItem[]>(() => {
        try {
            const raw = localStorage.getItem(FEATURES_STORAGE_KEY);
            return raw ? (JSON.parse(raw) as IssueItem[]) : [];
        } catch {
            return [];
        }
    });
    const [newBug, setNewBug] = useState("");
    const [newRequest, setNewRequest] = useState("");
    const autoHideCompletedMonths = useFinanceStore((s) => s.autoHideCompletedMonths);
    const [showFixedBugs, setShowFixedBugs] = useState(() => {
        try { return JSON.parse(localStorage.getItem("devops-show-fixed-bugs") || "false"); } catch { return false; }
    });
    const [showFulfilledRequests, setShowFulfilledRequests] = useState(() => {
        try { return JSON.parse(localStorage.getItem("devops-show-fulfilled-requests") || "false"); } catch { return false; }
    });

    useEffect(() => {
        try {
            localStorage.setItem(BUGS_STORAGE_KEY, JSON.stringify(bugs));
        } catch {
            /* ignore */
        }
    }, [bugs]);

    useEffect(() => {
        try {
            localStorage.setItem(FEATURES_STORAGE_KEY, JSON.stringify(requests));
        } catch {
            /* ignore */
        }
    }, [requests]);

    useEffect(() => {
        try { localStorage.setItem("devops-show-fixed-bugs", JSON.stringify(showFixedBugs)); } catch {}
    }, [showFixedBugs]);

    useEffect(() => {
        try { localStorage.setItem("devops-show-fulfilled-requests", JSON.stringify(showFulfilledRequests)); } catch {}
    }, [showFulfilledRequests]);

    const addItem = (
        text: string,
        setter: Dispatch<SetStateAction<IssueItem[]>>
    ) => {
        const value = text.trim();
        if (!value) {
            toast.error("Enter a description first.");
            return;
        }

        setter((prev) => [
            {
                id: crypto.randomUUID(),
                text: value,
                complete: false,
                createdAt: new Date().toISOString(),
            },
            ...prev,
        ]);
    };

    const toggleItem = (
        id: string,
        items: IssueItem[],
        setter: Dispatch<SetStateAction<IssueItem[]>>
    ) => {
        setter(items.map((item) => {
            if (item.id !== id) return item;
            if (!item.complete) {
                return { ...item, complete: true, completedAt: new Date().toISOString() };
            }
            return { ...item, complete: false, completedAt: null };
        }));
    };

    const clearCompleted = (setter: Dispatch<SetStateAction<IssueItem[]>>) => setter((prev) => prev.filter((i) => !i.complete));

    const removeItem = (
        id: string,
        setter: Dispatch<SetStateAction<IssueItem[]>>
    ) => {
        setter((prev) => prev.filter((item) => item.id !== id));
    };

    const openBugs = bugs.filter((item) => !item.complete).length;
    const fixedBugs = bugs.filter((item) => item.complete).length;
    const openRequests = requests.filter((item) => !item.complete).length;
    const fulfilledRequests = requests.filter((item) => item.complete).length;

    const shouldShowCompleted = (completedAt?: string | null) => {
        if (!completedAt) return true;
        if (!autoHideCompletedMonths || autoHideCompletedMonths <= 0) return true;
        try {
            const d = new Date(completedAt);
            const now = new Date();
            const months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
            return months < autoHideCompletedMonths;
        } catch {
            return true;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-3">
                <div className="p-3 rounded-full bg-muted/10">
                    <Bug className="h-6 w-6 text-destructive" />
                </div>
                <div>
                    <h2 className="text-3xl font-bold text-foreground">DevOps</h2>
                    <p className="text-muted-foreground">
                        Track known issues, feature requests, and deployment-related items.
                    </p>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-3">
                    <CardHeader>
                        <CardTitle>Issue Summary</CardTitle>
                        <CardDescription>
                            Keep bug and feature work separated so the team can focus on what matters next.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="rounded-lg border border-border p-4 bg-card">
                                <p className="text-sm text-muted-foreground">Open Bugs</p>
                                <p className="text-3xl font-bold">{openBugs}</p>
                            </div>
                            <div className="rounded-lg border border-border p-4 bg-card">
                                <p className="text-sm text-muted-foreground">Feature Requests</p>
                                <p className="text-3xl font-bold">{openRequests}</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between gap-4">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <Bug className="h-5 w-5 text-destructive" />
                                    Known Bugs
                                </CardTitle>
                                <CardDescription>
                                    Reported issues that need attention.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="newBug">Add a new bug</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="newBug"
                                    value={newBug}
                                    onChange={(e) => setNewBug(e.target.value)}
                                    placeholder="Describe the bug..."
                                    onKeyDown={(e) => e.key === "Enter" && addItem(newBug, setBugs)}
                                />
                                <Button onClick={() => {
                                    addItem(newBug, setBugs);
                                    setNewBug("");
                                }}>
                                    Add
                                </Button>
                            </div>
                        </div>

                        {bugs.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No bugs tracked yet. Add one to get started.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {/* Open bugs */}
                                {bugs.filter((b) => !b.complete).map((bug) => (
                                    <div key={bug.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                                        <button
                                            className={`rounded-full p-2 ${bug.complete ? "bg-success/10 text-success" : "bg-muted/10 text-muted-foreground"}`}
                                            onClick={() => toggleItem(bug.id, bugs, setBugs)}
                                            aria-label={bug.complete ? "Mark bug open" : "Mark bug fixed"}
                                        >
                                            {bug.complete ? "✓" : "○"}
                                        </button>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm ${bug.complete ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                                {bug.text}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Added {new Date(bug.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => removeItem(bug.id, setBugs)}>
                                            ✕
                                        </Button>
                                    </div>
                                ))}

                                {/* Completed bugs (collapsible) */}
                                {bugs.some((b) => b.complete) && (
                                    <div className="mt-2">
                                            <div className="flex items-center justify-between">
                                            <p className="text-sm text-muted-foreground">Fixed ({fixedBugs})</p>
                                            <div className="flex gap-2">
                                                <Button variant="ghost" size="sm" onClick={() => setShowFixedBugs((v) => !v)}>
                                                    {showFixedBugs ? "Hide" : "Show"}
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => clearCompleted(setBugs)}>Clear completed</Button>
                                            </div>
                                        </div>
                                        {showFixedBugs && (
                                            <div className="mt-2 space-y-2">
                                                {bugs.filter((b) => b.complete && shouldShowCompleted(b.completedAt ?? b.createdAt)).map((bug) => (
                                                    <div key={bug.id} className="flex items-center gap-3 rounded-lg border border-border bg-muted/10 p-3">
                                                        <button
                                                            className={`rounded-full p-2 bg-success/10 text-success`}
                                                            onClick={() => toggleItem(bug.id, bugs, setBugs)}
                                                            aria-label="Mark bug open"
                                                        >
                                                            ✓
                                                        </button>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm line-through text-muted-foreground">{bug.text}</p>
                                                            <p className="text-xs text-muted-foreground">Completed {new Date(bug.completedAt ?? bug.createdAt).toLocaleDateString()}</p>
                                                        </div>
                                                        <Button variant="ghost" size="icon" onClick={() => removeItem(bug.id, setBugs)}>
                                                            ✕
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-primary" />
                                Feature Requests
                            </CardTitle>
                            <CardDescription>
                                Ideas and improvements to prioritize next.
                            </CardDescription>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="newRequest">Add a request</Label>
                            <div className="flex gap-2">
                                <Input
                                    id="newRequest"
                                    value={newRequest}
                                    onChange={(e) => setNewRequest(e.target.value)}
                                    placeholder="Describe the feature..."
                                    onKeyDown={(e) => e.key === "Enter" && addItem(newRequest, setRequests)}
                                />
                                <Button onClick={() => {
                                    addItem(newRequest, setRequests);
                                    setNewRequest("");
                                }}>
                                    Add
                                </Button>
                            </div>
                        </div>

                        {requests.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No feature requests yet — add one to capture your ideas.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {/* Open requests */}
                                {requests.filter((r) => !r.complete).map((request) => (
                                    <div key={request.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                                        <button
                                            className={`rounded-full p-2 ${request.complete ? "bg-success/10 text-success" : "bg-muted/10 text-muted-foreground"}`}
                                            onClick={() => toggleItem(request.id, requests, setRequests)}
                                            aria-label={request.complete ? "Mark request open" : "Mark request completed"}
                                        >
                                            {request.complete ? "✓" : "○"}
                                        </button>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-sm ${request.complete ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                                {request.text}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Added {new Date(request.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => removeItem(request.id, setRequests)}>
                                            ✕
                                        </Button>
                                    </div>
                                ))}

                                {/* Completed requests (collapsible) */}
                                {requests.some((r) => r.complete) && (
                                    <div className="mt-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-sm text-muted-foreground">Fulfilled ({fulfilledRequests})</p>
                                            <div className="flex gap-2">
                                                <Button variant="ghost" size="sm" onClick={() => setShowFulfilledRequests((v) => !v)}>
                                                    {showFulfilledRequests ? "Hide" : "Show"}
                                                </Button>
                                                <Button variant="outline" size="sm" onClick={() => clearCompleted(setRequests)}>Clear completed</Button>
                                            </div>
                                        </div>
                                        {showFulfilledRequests && (
                                            <div className="mt-2 space-y-2">
                                                {requests.filter((r) => r.complete && shouldShowCompleted(r.completedAt ?? r.createdAt)).map((request) => (
                                                    <div key={request.id} className="flex items-center gap-3 rounded-lg border border-border bg-muted/10 p-3">
                                                        <button
                                                            className={`rounded-full p-2 bg-success/10 text-success`}
                                                            onClick={() => toggleItem(request.id, requests, setRequests)}
                                                            aria-label="Mark request open"
                                                        >
                                                            ✓
                                                        </button>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm line-through text-muted-foreground">{request.text}</p>
                                                            <p className="text-xs text-muted-foreground">Completed {new Date(request.completedAt ?? request.createdAt).toLocaleDateString()}</p>
                                                        </div>
                                                        <Button variant="ghost" size="icon" onClick={() => removeItem(request.id, setRequests)}>
                                                            ✕
                                                        </Button>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
