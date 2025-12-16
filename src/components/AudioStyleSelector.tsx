"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Settings2, Wand2 } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { getCustomVoice } from "@/app/actions";
import { Skeleton } from "./ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

interface AudioStyleSelectorProps {
  setVoiceName: (voiceName: string) => void;
}

const formSchema = z.object({
  desiredStyle: z
    .string()
    .min(5, "Please describe the desired voice style in more detail."),
});

const AudioStyleSelector = ({ setVoiceName }: AudioStyleSelectorProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    voiceName: string;
    reasoning?: string;
  } | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      desiredStyle: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setResult(null);
    const response = await getCustomVoice({ desiredStyle: values.desiredStyle });

    if (response.success && response.data) {
      setVoiceName(response.data.voiceConfig.prebuiltVoiceConfig.voiceName);
      setResult({
        voiceName: response.data.voiceConfig.prebuiltVoiceConfig.voiceName,
        reasoning: response.data.feasibilityReasoning,
      });
      toast({
        title: "Voice Style Updated!",
        description: `Now using voice: ${response.data.voiceConfig.prebuiltVoiceConfig.voiceName}`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Error",
        description: response.error || "Could not generate voice style.",
      });
    }
    setIsLoading(false);
  }

  return (
    <Card className="shadow-md">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="item-1" className="border-b-0">
          <AccordionTrigger className="p-6 hover:no-underline">
            <div className="flex items-center gap-3">
              <Settings2 className="h-6 w-6 text-primary" />
              <div className="text-left">
                <h3 className="font-headline text-xl font-semibold">
                  Audio Style Customization
                </h3>
                <p className="text-sm text-muted-foreground">
                  Use AI to change the chant voice.
                </p>
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-6 pb-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="desiredStyle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Desired Voice Style</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., 'a calm Indian female voice'"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading ? (
                    <>
                      <Wand2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Generate Voice
                    </>
                  )}
                </Button>
              </form>
            </Form>

            {isLoading && (
              <div className="mt-6 space-y-4">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-16 w-full" />
              </div>
            )}

            {result && (
              <Alert className="mt-6">
                <Wand2 className="h-4 w-4" />
                <AlertTitle>AI Voice Generation Result</AlertTitle>
                <AlertDescription className="space-y-2">
                  <p>
                    <strong>New Voice Selected:</strong> {result.voiceName}
                  </p>
                  {result.reasoning && (
                    <p>
                      <strong>AI Feasibility Note:</strong> {result.reasoning}
                    </p>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
};

export default AudioStyleSelector;
