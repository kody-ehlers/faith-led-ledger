import { Dispatch, SetStateAction, useEffect, useState } from "react";
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
        setter(items.map((item) => (item.id === id ? { ...item, complete: !item.complete } : item)));
    };

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
                                {bugs.map((bug) => (
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
                                {requests.map((request) => (
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
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
