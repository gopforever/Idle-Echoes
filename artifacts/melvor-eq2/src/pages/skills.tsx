import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetSkills, 
  useToggleSkillTraining,
  getGetSkillsQueryKey,
  getGetSkillsSummaryQueryKey
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export default function SkillsPage() {
  const queryClient = useQueryClient();
  const { data: skills, isLoading } = useGetSkills();
  const toggleTraining = useToggleSkillTraining();

  const handleToggle = (skillId: string) => {
    toggleTraining.mutate({ data: { skillId } } as any, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetSkillsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetSkillsSummaryQueryKey() });
      }
    });
  };

  // Setup simple refetch interval for skill updates when training
  React.useEffect(() => {
    const hasTraining = skills?.some(s => s.isTraining);
    if (hasTraining) {
      const interval = setInterval(() => {
        queryClient.invalidateQueries({ queryKey: getGetSkillsQueryKey() });
      }, 5000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [skills, queryClient]);

  if (isLoading || !skills) return <Skeleton className="h-[600px] w-full" />;

  const groupedSkills = skills.reduce((acc, skill) => {
    if (!acc[skill.category]) acc[skill.category] = [];
    acc[skill.category].push(skill);
    return acc;
  }, {} as Record<string, typeof skills>);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {Object.entries(groupedSkills).map(([category, categorySkills]) => (
        <div key={category} className="space-y-4">
          <h2 className="text-xl font-serif font-bold text-slate-200 capitalize px-2 border-b border-slate-800 pb-2">
            {category} Skills
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categorySkills.map(skill => {
              const xpPercent = (skill.xp / skill.xpToNextLevel) * 100;
              return (
                <Card 
                  key={skill.id} 
                  className={`bg-card/40 backdrop-blur border-slate-800 transition-colors ${
                    skill.isTraining ? 'border-primary/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : ''
                  }`}
                >
                  <CardContent className="p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-slate-900 border border-slate-700 flex items-center justify-center text-xl">
                          {skill.icon}
                        </div>
                        <div>
                          <div className="font-bold text-slate-200">{skill.name}</div>
                          <div className="text-xs text-primary font-medium tracking-wider">Level {skill.level} / {skill.maxLevel}</div>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant={skill.isTraining ? "default" : "secondary"}
                        onClick={() => handleToggle(skill.id)}
                        disabled={toggleTraining.isPending}
                      >
                        {skill.isTraining ? "Training..." : "Train"}
                      </Button>
                    </div>

                    <div className="space-y-1 pt-2">
                      <div className="flex justify-between text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                        <span>{Math.floor(skill.xp)} / {skill.xpToNextLevel} XP</span>
                        {skill.isTraining && (
                          <span className="text-green-400">+{skill.xpPerHour} XP/hr</span>
                        )}
                      </div>
                      <Progress value={xpPercent} className="h-1.5 bg-slate-900" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
