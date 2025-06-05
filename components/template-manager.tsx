"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";

import { PlusCircle } from "lucide-react";
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
import { TemplateCard, Template } from "@/components/template-card";
import { useSession } from "next-auth/react";

export default function TemplateManager() {
  const { data: session } = useSession();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);

  const [formName, setFormName] = useState("");
  const [formContent, setFormContent] = useState("");

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(
    null,
  );

  const handleAddNew = useCallback(() => {
    setEditingTemplate(null);
    setFormName("");
    setFormContent("");
    setIsDialogOpen(true);
  }, []);

  const handleCardClick = useCallback((template: Template) => {
    setEditingTemplate(template);
    setFormName(template?.title ?? "");
    setFormContent(template?.content ?? "");
    setIsDialogOpen(true);
  }, []);

  const handleDeleteRequest = useCallback((template: Template) => {
    setTemplateToDelete(template);
    setIsDeleteDialogOpen(true);
  }, []);

  const fetchTemplates = useCallback(async () => {
    const res = await fetch(`/api/templates`);
    if (res.ok) {
      const data = await res.json();
      setTemplates(data || []);
    }
  }, []);

  // Fetch templates when session is available
  useEffect(() => {
    if (!session?.user?.id) return;
    fetchTemplates();
  }, [session?.user?.id, fetchTemplates]);

  const confirmDelete = useCallback(async () => {
    if (templateToDelete) {
      // Call backend to delete template
      await fetch(`/api/templates/${templateToDelete.id}`, {
        method: "DELETE",
      });
      await fetchTemplates(); // Refresh templates after delete
    }
    setIsDeleteDialogOpen(false);
    setTemplateToDelete(null);
  }, [templateToDelete, fetchTemplates]);

  const handleSave = useCallback(async () => {
    if (!formName.trim() || !formContent.trim()) {
      alert("Template name and content cannot be empty.");
      return;
    }
    const now = new Date().toISOString();
    if (editingTemplate) {
      // Update template via backend
      const res = await fetch(`/api/templates/${editingTemplate.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formName,
          content: formContent,
        }),
      });
      if (res.ok) {
        await fetchTemplates();
      }
    } else {
      // Create template via backend
      const res = await fetch(`/api/templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formName,
          content: formContent,
        }),
      });
      if (res.ok) {
        await fetchTemplates();
      }
    }
    setIsDialogOpen(false);
    setEditingTemplate(null);
  }, [
    formName,
    formContent,
    editingTemplate,
    session?.user?.id,
    fetchTemplates,
  ]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex justify-between">
        <div className="text-left">
          <h1 className="mb-2 text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Create, edit, and manage your static message templates for LLMs.
          </p>
        </div>
        <div className="flex justify-end">
          <Button size="sm" onClick={handleAddNew}>
            <PlusCircle className="h-4 w-4" />
            Add template
          </Button>
        </div>
      </div>

      {templates.length === 0 ? (
        <Card className="bg-muted text-center">
          <CardContent className="p-6">
            <p className="text-muted-foreground">
              No templates yet. Click "Add template" to get started.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onClick={handleCardClick}
              onDelete={handleDeleteRequest}
            />
          ))}
        </div>
      )}

      <Dialog
        open={isDialogOpen}
        onOpenChange={(isOpen) => {
          setIsDialogOpen(isOpen);
          if (!isOpen) setEditingTemplate(null);
        }}
      >
        <DialogContent className="flex max-h-[90vh] flex-col overflow-auto p-4 pt-6 sm:max-w-[600px]">
          <DialogHeader className="px-2">
            <DialogTitle>
              {editingTemplate ? "Edit Template" : "Add Template"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid flex-grow gap-4 overflow-y-auto px-2 py-2">
            <div className="grid gap-2">
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g., Standard Welcome"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="content">Template Content</Label>
              <Textarea
                id="content"
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                placeholder="Hello, welcome to our service. How can I help you today?"
                className="min-h-[150px]"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave}>Save Template</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              template "{templateToDelete?.title}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTemplateToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
