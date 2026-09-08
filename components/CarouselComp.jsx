"use client";

import { Card, CardContent } from "@/components/ui/card";
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    CarouselNext,
    CarouselPrevious,
} from "@/components/ui/carousel";

import { Separator } from "./ui/separator";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

export default function CarouselComp({
    dataList,
    handleShortlist,
    shortlistStatus,
}) {
    const getQuestions = (data) => {
        if (!data) return [];

        if (Array.isArray(data.QuestionDetails) && data.QuestionDetails.length > 0) {
            return data.QuestionDetails.map((item) => [
                item.question || item.key || "Question",
                item.answer || "Not Answered",
            ]);
        }

        if (!data?.Questions) return [];

        if (Array.isArray(data.Questions)) {
            return data.Questions.map((item, i) => {
                if (Array.isArray(item)) {
                    return [item[0] || `Question ${i + 1}`, item[1] ?? "Not Answered"];
                }
                if (item && typeof item === "object") {
                    const qTitle = item.question || item.questionText || item.name || item.key || `Question ${i + 1}`;
                    const aText = item.answer ?? item.value ?? item.text ?? "Not Answered";
                    return [qTitle, aText];
                }
                return [`Question ${i + 1}`, String(item ?? "Not Answered")];
            });
        }

        if (typeof data.Questions === "object") {
            return Object.entries(data.Questions).map(([q, a]) => [q, a ?? "Not Answered"]);
        }

        return [];
    };

    return (
        <Carousel className="max-w-full">
            <CarouselContent>
                {dataList.map((data, index) => {
                    const questions = getQuestions(data);

                    return (
                        <CarouselItem key={data._id || data.id || index}>
                            <div className="p-1">
                                <Card className="h-[55vh] max-h-[55vh] border-none shadow-none overflow-hidden">
                                    <CardContent className="flex h-full flex-col p-3 overflow-hidden">
                                        <div className="flex flex-col items-center justify-center mb-3 gap-1 font-medium shrink-0">
                                            <span>{data.Name || "Unnamed Applicant"}</span>
                                            <span className="font-light text-sm opacity-[50%]">
                                                {data.Department || "No Department"}
                                            </span>
                                        </div>
                                        <div className="w-full flex-1 flex flex-col gap-5 overflow-y-auto pr-1">
                                            {questions.length > 0 ? (
                                                questions.map(([question, answer], qIndex) => {
                                                    const displayAnswer =
                                                        answer === undefined || answer === null || answer === ""
                                                            ? "Not Answered"
                                                            : answer;

                                                    return (
                                                        <div
                                                            key={`${question}-${qIndex}`}
                                                            className="border p-3 border-sm rounded-md"
                                                        >
                                                            <h1 className="mb-1 font-light">
                                                                {qIndex + 1}. {question}{" "}
                                                            </h1>
                                                            <Separator />
                                                            <p className="mt-1 font-normal opacity-[70%]">
                                                                {displayAnswer}
                                                            </p>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <p className="text-sm text-gray-400">
                                                    No responses available for this applicant.
                                                </p>
                                            )}
                                        </div>
                                        {Boolean(data.round1MailSent) ? (
                                            <Button
                                                disabled
                                                className="bg-muted/60 text-muted-foreground border border-border/80 cursor-not-allowed select-none rounded-md mt-4 shrink-0 inline-flex items-center justify-center gap-1.5"
                                                title="Decision email sent. Round 1 decision is permanently locked."
                                            >
                                                <Lock className="h-4 w-4 text-amber-500" />
                                                <span>
                                                    {shortlistStatus[index]
                                                        ? "Shortlisted (Mail Sent 🔒)"
                                                        : "Decision Locked (Mail Sent 🔒)"}
                                                </span>
                                            </Button>
                                        ) : (
                                            <Button
                                                onClick={() => handleShortlist(index)}
                                                className={`text-white rounded-md mt-4 shrink-0 ${
                                                    shortlistStatus[index]
                                                        ? "bg-red-600 hover:bg-red-700"
                                                        : "bg-green-600 hover:bg-green-700"
                                                }`}
                                            >
                                                {shortlistStatus[index]
                                                    ? "Unshortlist Applicant"
                                                    : "Shortlist Applicant"}
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        </CarouselItem>
                    );
                })}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
        </Carousel>
    );
}
