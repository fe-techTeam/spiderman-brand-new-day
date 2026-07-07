"use client";

import { useCallback, useEffect, useState } from "react";
import { MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "@/lib/admin/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function AdminQuizPage() {
  const [questions, setQuestions] = useState(null);
  const [avatars, setAvatars] = useState([]);
  const [showInactive, setShowInactive] = useState(false);

  // Add question dialog
  const [addingQuestion, setAddingQuestion] = useState(false);
  const [qText, setQText] = useState("");
  const [qPosition, setQPosition] = useState("");

  // Edit question text dialog
  const [editing, setEditing] = useState(null); // question being edited
  const [editText, setEditText] = useState("");

  // Deactivate question confirm
  const [deactivating, setDeactivating] = useState(null); // question

  // Add option dialog
  const [addingOptionFor, setAddingOptionFor] = useState(null); // question
  const [oText, setOText] = useState("");
  const [oPrimary, setOPrimary] = useState("");
  const [oSecondary, setOSecondary] = useState("");
  const [oPrimaryPts, setOPrimaryPts] = useState("2");
  const [oSecondaryPts, setOSecondaryPts] = useState("1");

  // Delete option confirm
  const [deletingOption, setDeletingOption] = useState(null); // option

  const load = useCallback(async () => {
    try {
      const [q, a] = await Promise.all([adminApi("/quiz/questions"), adminApi("/avatars")]);
      setQuestions(q.questions);
      setAvatars(a.avatars.filter((av) => !!av.is_active));
    } catch (e) {
      toast.error(e.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function patchQuestion(id, body, message) {
    try {
      await adminApi(`/quiz/questions/${id}`, { method: "PATCH", body });
      toast.success(message);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function patchOption(id, body, message = "Option updated") {
    try {
      await adminApi(`/quiz/options/${id}`, { method: "PATCH", body });
      toast.success(message);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function createQuestion() {
    const pos = parseInt(qPosition, 10);
    try {
      await adminApi("/quiz/questions", {
        method: "POST",
        body: {
          text: qText.trim(),
          position: Number.isNaN(pos) ? (questions?.length || 0) + 1 : pos,
        },
      });
      toast.success("Question added");
      setAddingQuestion(false);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function deactivateQuestion(id) {
    try {
      await adminApi(`/quiz/questions/${id}`, { method: "DELETE" });
      toast.success("Question deactivated");
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function createOption() {
    const pp = parseInt(oPrimaryPts, 10);
    const sp = parseInt(oSecondaryPts, 10);
    try {
      await adminApi(`/quiz/questions/${addingOptionFor.id}/options`, {
        method: "POST",
        body: {
          text: oText.trim(),
          primaryAvatarId: parseInt(oPrimary, 10),
          secondaryAvatarId: parseInt(oSecondary, 10),
          primaryPoints: Number.isNaN(pp) ? 2 : pp,
          secondaryPoints: Number.isNaN(sp) ? 1 : sp,
        },
      });
      toast.success("Option added");
      setAddingOptionFor(null);
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  async function deleteOption(id) {
    try {
      await adminApi(`/quiz/options/${id}`, { method: "DELETE" });
      toast.success("Option deleted");
      load();
    } catch (e) {
      toast.error(e.message);
    }
  }

  const visible = questions ? questions.filter((q) => showInactive || !!q.is_active) : [];

  const avatarSelect = (value, onValueChange) => (
    <Select value={value ? String(value) : ""} onValueChange={onValueChange}>
      <SelectTrigger className="w-40">
        <SelectValue placeholder="Pick avatar" />
      </SelectTrigger>
      <SelectContent>
        {avatars.map((av) => (
          <SelectItem key={av.id} value={String(av.id)}>
            {av.emoji} {av.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Quiz</h1>
          <p className="text-sm text-muted-foreground">
            Each answer awards points to a primary (2) and secondary (1) avatar. Highest total
            wins; the tie-breaker question settles draws.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch id="show-inactive" checked={showInactive} onCheckedChange={setShowInactive} />
            <Label htmlFor="show-inactive" className="text-sm text-muted-foreground">
              Show inactive
            </Label>
          </div>
          <Button
            onClick={() => {
              setQText("");
              setQPosition(String((questions?.length || 0) + 1));
              setAddingQuestion(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add question
          </Button>
        </div>
      </div>

      {!questions ? (
        <Skeleton className="h-64" />
      ) : visible.length === 0 ? (
        <p className="py-10 text-center text-muted-foreground">
          No {showInactive ? "" : "active "}questions yet.
        </p>
      ) : (
        visible.map((q) => (
          <Card key={q.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="flex flex-wrap items-center gap-2 text-base">
                Q{q.position}: {q.text}
                {!!q.is_tiebreaker && <Badge>Tie-breaker</Badge>}
                {!q.is_active && <Badge variant="outline">Inactive</Badge>}
              </CardTitle>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => {
                      setEditing(q);
                      setEditText(q.text);
                    }}
                  >
                    Edit text
                  </DropdownMenuItem>
                  {!q.is_tiebreaker && (
                    <DropdownMenuItem
                      onClick={() =>
                        patchQuestion(q.id, { isTiebreaker: true }, "Tie-breaker updated")
                      }
                    >
                      Make tie-breaker
                    </DropdownMenuItem>
                  )}
                  {!!q.is_active && (
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => setDeactivating(q)}
                    >
                      Deactivate
                    </DropdownMenuItem>
                  )}
                  {!q.is_active && (
                    <DropdownMenuItem
                      onClick={() => patchQuestion(q.id, { isActive: true }, "Question reactivated")}
                    >
                      Reactivate
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent className="space-y-3">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">Option text</TableHead>
                    <TableHead>Primary avatar</TableHead>
                    <TableHead>Pts</TableHead>
                    <TableHead>Secondary avatar</TableHead>
                    <TableHead>Pts</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="text-right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {q.options.map((o) => (
                    <TableRow key={o.id}>
                      <TableCell className="whitespace-normal text-sm">{o.text}</TableCell>
                      <TableCell>
                        {avatarSelect(o.primary_avatar_id, (v) =>
                          patchOption(o.id, { primaryAvatarId: parseInt(v, 10) })
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          key={`pp-${o.id}-${o.primary_points}`}
                          type="number"
                          className="w-16"
                          defaultValue={o.primary_points}
                          onBlur={(e) => {
                            const v = parseInt(e.target.value, 10);
                            if (Number.isNaN(v) || v === o.primary_points) return;
                            patchOption(o.id, { primaryPoints: v });
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {avatarSelect(o.secondary_avatar_id, (v) =>
                          patchOption(o.id, { secondaryAvatarId: parseInt(v, 10) })
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          key={`sp-${o.id}-${o.secondary_points}`}
                          type="number"
                          className="w-16"
                          defaultValue={o.secondary_points}
                          onBlur={(e) => {
                            const v = parseInt(e.target.value, 10);
                            if (Number.isNaN(v) || v === o.secondary_points) return;
                            patchOption(o.id, { secondaryPoints: v });
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={!!o.is_active}
                          onCheckedChange={(checked) =>
                            patchOption(
                              o.id,
                              { isActive: checked },
                              checked ? "Option activated" : "Option deactivated"
                            )
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => setDeletingOption(o)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {q.options.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                        No options yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setOText("");
                  setOPrimary("");
                  setOSecondary("");
                  setOPrimaryPts("2");
                  setOSecondaryPts("1");
                  setAddingOptionFor(q);
                }}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add option
              </Button>
            </CardContent>
          </Card>
        ))
      )}

      <Dialog open={addingQuestion} onOpenChange={(open) => !open && setAddingQuestion(false)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add question</DialogTitle>
            <DialogDescription>
              New questions start active and appear in the quiz at the given position.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="q-text">Question text</Label>
              <Textarea
                id="q-text"
                placeholder="e.g. How do you handle a rooftop chase?"
                value={qText}
                onChange={(e) => setQText(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="q-position">Position</Label>
              <Input
                id="q-position"
                type="number"
                className="w-24"
                value={qPosition}
                onChange={(e) => setQPosition(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddingQuestion(false)}>
              Cancel
            </Button>
            <Button disabled={!qText.trim()} onClick={createQuestion}>
              Add question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit question text</DialogTitle>
          </DialogHeader>
          <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              disabled={!editText.trim()}
              onClick={async () => {
                await patchQuestion(editing.id, { text: editText.trim() }, "Question updated");
                setEditing(null);
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!addingOptionFor} onOpenChange={(open) => !open && setAddingOptionFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add option</DialogTitle>
            <DialogDescription>
              Q{addingOptionFor?.position}: {addingOptionFor?.text}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="o-text">Option text</Label>
              <Input
                id="o-text"
                placeholder="e.g. Swing straight in"
                value={oText}
                onChange={(e) => setOText(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-2">
                <Label>Primary avatar</Label>
                {avatarSelect(oPrimary, setOPrimary)}
              </div>
              <div className="space-y-2">
                <Label htmlFor="o-pp">Pts</Label>
                <Input
                  id="o-pp"
                  type="number"
                  className="w-16"
                  value={oPrimaryPts}
                  onChange={(e) => setOPrimaryPts(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-2">
                <Label>Secondary avatar</Label>
                {avatarSelect(oSecondary, setOSecondary)}
              </div>
              <div className="space-y-2">
                <Label htmlFor="o-sp">Pts</Label>
                <Input
                  id="o-sp"
                  type="number"
                  className="w-16"
                  value={oSecondaryPts}
                  onChange={(e) => setOSecondaryPts(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddingOptionFor(null)}>
              Cancel
            </Button>
            <Button disabled={!oText.trim() || !oPrimary || !oSecondary} onClick={createOption}>
              Add option
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deactivating} onOpenChange={(open) => !open && setDeactivating(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate this question?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deactivating?.text}&rdquo; is removed from the quiz but kept here, so past
              results stay intact. You can reactivate it later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await deactivateQuestion(deactivating.id);
                setDeactivating(null);
              }}
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!deletingOption}
        onOpenChange={(open) => !open && setDeletingOption(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this option?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deletingOption?.text}&rdquo; is removed from the question.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                await deleteOption(deletingOption.id);
                setDeletingOption(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
