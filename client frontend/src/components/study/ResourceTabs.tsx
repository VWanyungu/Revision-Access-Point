import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Video, Clock, Eye, Brain, Bookmark, Tag, Calendar, BookCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TruncatedText } from "@/components/ui/truncated-text";

// PDF viewer imports removed - now handled by standalone page

interface ResourceTabsProps {
  onGenerateQuiz: (resourceUrl: string, resourceTitle: string) => void;
  onGenerateAnswers: (resourceUrl: string, resourceTitle: string) => void;
  onViewResource: (url: string) => void;
  resources: any[];
}

type ResourceType = "notes" | "cats" | "exams" | "tutorials";

const tabConfig = [
  { id: "notes", label: "Notes", icon: FileText, color: "text-primary" },
  { id: "cats", label: "CATs", icon: FileText, color: "text-warning" },
  { id: "exams", label: "Exams", icon: FileText, color: "text-accent" },
  { id: "tutorials", label: "Tutorials", icon: Video, color: "text-success" },
];

const ResourceCard = ({ resource, onGenerateQuiz, onGenerateAnswers, docViewToggleFn, resourceType }) => {
  const [isHovered, setIsHovered] = useState(false);

  const Icon = resource.type === "tutorials" ? Video : FileText;
  const showAnswersButton = resourceType === "cats" || resourceType === "exams";
  const resourceTypeColourMatrix = {
    "notes":"primary",
    "cats": "warning",
    "exams": "destructive",
    "tutorials":"success"
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Card className="group relative overflow-hidden transition-shadow hover:shadow-elevated">
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center bg-${resourceTypeColourMatrix[resourceType]}/10 `}>
              <Icon className={`h-6 w-6 text-${resourceTypeColourMatrix[resourceType]}`} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <TruncatedText as="h3" className="block font-semibold text-base mb-1" text={resource.name} />

              {/* Topics */}
              <div className="flex flex-wrap gap-1 mb-2">
                {[].map((topic) => (
                  <Badge key={topic} variant="secondary" className="text-xs">
                    <Tag className="h-3 w-3 mr-1" />
                    {topic}
                  </Badge>
                ))}
              </div>

              {/* Meta */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(resource.created_at).toLocaleDateString()}
                </span>
                {resource.duration && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {resource.duration}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
            <Button variant="outline" size="sm" className="flex-1" onClick={docViewToggleFn}>
              <Eye className="h-4 w-4" />
              View
            </Button>
            {showAnswersButton ? (
              <Button variant="outline" size="sm" className="flex-1" onClick={onGenerateAnswers}>
                <BookCheck className="h-4 w-4" />
                Generate Answers
              </Button>
            ) : (
              <Button variant="outline" size="sm" className="flex-1" onClick={onGenerateQuiz}>
                <Brain className="h-4 w-4" />
                Generate Quiz
              </Button>
            )}
            <Button variant="ghost" size="icon-sm">
              <Bookmark className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>

        {/* Hover indicator */}
        {/* <motion.div
          className="absolute left-0 top-0 h-full w-1 bg-primary"
          initial={{ scaleY: 0 }}
          animate={{ scaleY: isHovered ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        /> */}
      </Card>
    </motion.div>
  );
};

const extractIframeAttributes = (iframeString: string) => {
  const srcMatch = iframeString.match(/src="([^"]*)"/);
  const titleMatch = iframeString.match(/title="([^"]*)"/);

  return {
    src: srcMatch ? srcMatch[1] : null,
    title: titleMatch ? titleMatch[1] : null,
  };
};

const TutorialResourceCard = ({ resource, onGenerateQuiz, docViewToggleFn }) => {
  const [isHovered, setIsHovered] = useState(false);
  const iframeAttributes = extractIframeAttributes(resource.public_access_url);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="w-full max-w-3xl mx-auto"
    >
      <Card className="group relative overflow-hidden transition-shadow hover:shadow-elevated">
        <CardContent className="p-0">
          {/* Video */}
          <div className="relative w-full pt-[56.25%] overflow-hidden rounded-t-lg">
            <iframe
              className="absolute top-0 left-0 w-full h-full"
              src={iframeAttributes.src} // example: "https://www.youtube.com/embed/yCf2lZoRrEE"
              title={iframeAttributes.title}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>

          {/* Content below video */}
          <div className="p-4">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Video className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <TruncatedText as="h3" className="block font-semibold text-base mb-1" text={resource.name} />

                {/* Topics */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {resource.topics?.map((topic) => (
                    <Badge key={topic} variant="secondary" className="text-xs flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {topic}
                    </Badge>
                  ))}
                </div>

                {/* Meta */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(resource.created_at).toLocaleDateString()}
                  </span>
                  {resource.duration && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {resource.duration}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Hover indicator */}
          {/* <motion.div
            className="absolute left-0 top-0 h-full w-1 bg-primary"
            initial={{ scaleY: 0 }}
            animate={{ scaleY: isHovered ? 1 : 0 }}
            transition={{ duration: 0.2 }}
          /> */}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export const ResourceTabs = ({ onGenerateQuiz, onGenerateAnswers, onViewResource, resources }: ResourceTabsProps) => {
  const [activeTab, setActiveTab] = useState<ResourceType>("notes");
  const [pageByTab, setPageByTab] = useState<Record<string, number>>({});
  const itemsPerPage = 6;

  const getCurrentPage = (tabId: string) => pageByTab[tabId] ?? 1;

  const setCurrentPage = (tabId: string, page: number) => {
    setPageByTab(prev => ({
      ...prev,
      [tabId]: page,
    }));
  };

  const toggleDocView = (url: string) => {
    onViewResource(url);
  };

  return (
    <div className="px-6 md:px-0">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ResourceType)}>
        <TabsList className="grid grid-cols-4 h-auto">
          {tabConfig.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="m-1 flex items-center gap-2 py-3 data-[state=active]:shadow-sm"
            >
              <tab.icon className={`h-4 w-4 hidden md:block${activeTab === tab.id ? tab.color : ""}`} />
              <span className="">{tab.label}</span>
              <Badge variant="secondary" className="ml-1 text-xs hidden md:block">
                {resources.filter((r) => r.resource_types.name === tab.id).length}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* {tabConfig.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="mt-6 mx-6 md:mx-0">
            <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
              {resources
                .filter((r) => r.resource_types.name === tab.id)
                .map((resource) => {
                  if (tab.id === "tutorials") {
                    return <TutorialResourceCard
                      key={resource.id}
                      resource={resource}
                      onGenerateQuiz={() => onGenerateQuiz(resource.id)}
                      docViewToggleFn={() => {toggleDocView(resource.public_access_url)}}
                    />
                  }
                  return <ResourceCard
                    key={resource.id}
                    resource={resource}
                    onGenerateQuiz={() => onGenerateQuiz(resource.id)}
                    docViewToggleFn={() => {toggleDocView(resource.public_access_url)}}
                  />
                })}
            </div>
            {filteredResources.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                No {tab.label.toLowerCase()} available yet.
              </div>
            )}
          </TabsContent>
        ))} */}
        {tabConfig.map((tab) => {
          const tabResources = resources.filter(
            (r) => r.resource_types.name === tab.id
          );

          const currentPage = getCurrentPage(tab.id);
          const totalPages = Math.ceil(tabResources.length / itemsPerPage);

          const paginatedResources = tabResources.slice(
            (currentPage - 1) * itemsPerPage,
            currentPage * itemsPerPage
          );

          return (
            <TabsContent
              key={tab.id}
              value={tab.id}
              className="mt-6"
            >
              <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
                {paginatedResources.map((resource) =>
                  tab.id === "tutorials" ? (
                    <TutorialResourceCard
                      key={resource.id}
                      resource={resource}
                      onGenerateQuiz={() => onGenerateQuiz(resource.public_access_url, resource.name)}
                      docViewToggleFn={() =>
                        toggleDocView(resource.public_access_url)
                      }
                    />
                  ) : (
                    <ResourceCard
                      key={resource.id}
                      resource={resource}
                      resourceType={tab.id}
                      onGenerateQuiz={() => onGenerateQuiz(resource.public_access_url, resource.name)}
                      onGenerateAnswers={() => onGenerateAnswers(resource.public_access_url, resource.name)}
                      docViewToggleFn={() =>
                        toggleDocView(resource.public_access_url)
                      }
                    />
                  )
                )}
              </div>

              {tabResources.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No {tab.label.toLowerCase()} available yet.
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6 gap-2">
                  <span className="text-xs text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>

                  <div className="flex gap-2 items-center">
                    <Button
                      variant="pagination"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(tab.id, currentPage - 1)}
                    >
                      Prev
                    </Button>
                    <Button
                      variant="pagination"
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(tab.id, currentPage + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          );
        })}

      </Tabs>
    </div>
  );
};

export const ResourceDiv = ({ onGenerateQuiz, onGenerateAnswers, onViewResource, resources }: ResourceTabsProps) => {
  const [activeTab, setActiveTab] = useState<ResourceType>("notes");
  const [page, setPage] = useState<Record<string, number>>({});
  const itemsPerPage = 6;

  const getCurrentPage = (tabId: string) => page["0"] ?? 1;

  const setCurrentPage = (tabId: string, page: number) => {
    setPage(prev => ({
      ...prev,
      ["0"]: page,
    }));
  };

  const toggleDocView = (url: string) => {
    onViewResource(url);
  };

  const currentPage = getCurrentPage("0");
  const totalPages = Math.ceil(resources.length / itemsPerPage);

  const paginatedResources = resources.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="px-6 md:px-0">
      <div>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          {paginatedResources.map((resource) =>
            resource.resource_types.name === "tutorials" ? (
              <TutorialResourceCard
                key={resource.id}
                resource={resource}
                onGenerateQuiz={() => onGenerateQuiz(resource.public_access_url, resource.name)}
                docViewToggleFn={() =>
                  toggleDocView(resource.public_access_url)
                }
              />
            ) : (
              <ResourceCard
                key={resource.id}
                resource={resource}
                resourceType={resource.resource_types.name}
                onGenerateQuiz={() => onGenerateQuiz(resource.public_access_url, resource.name)}
                onGenerateAnswers={() => onGenerateAnswers(resource.public_access_url, resource.name)}
                docViewToggleFn={() =>
                  toggleDocView(resource.public_access_url)
                }
              />
            )
          )}
        </div>

        {resources.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No resources found
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-6 gap-2">
            <span className="text-xs text-gray-600">
              Page {currentPage} of {totalPages}
            </span>

            <div className="flex gap-2 items-center">
              <Button
                variant="pagination"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage("0", currentPage - 1)}
              >
                Prev
              </Button>
              <Button
                variant="pagination"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage("0", currentPage + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const DisplayResourceTabs = ({ resources }) => {
  const [activeTab, setActiveTab] = useState<ResourceType>("notes");
  const [pageByTab, setPageByTab] = useState<Record<string, number>>({});
  const itemsPerPage = 6;

  const getCurrentPage = (tabId: string) => pageByTab[tabId] ?? 1;

  const setCurrentPage = (tabId: string, page: number) => {
    setPageByTab(prev => ({
      ...prev,
      [tabId]: page,
    }));
  };

  return (
    <div className="px-6 md:px-0">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ResourceType)}>
        <TabsList className="grid grid-cols-4 h-auto">
          {tabConfig.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="m-1 flex items-center gap-2 py-3 data-[state=active]:shadow-sm"
            >
              <tab.icon className={`h-4 w-4 hidden md:block${activeTab === tab.id ? tab.color : ""}`} />
              <span className="">{tab.label}</span>
              <Badge variant="secondary" className="ml-1 text-xs hidden md:block">
                {resources.filter((r) => r.resource_types.name === tab.id).length}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {tabConfig.map((tab) => {
          const tabResources = resources.filter(
            (r) => r.resource_types.name === tab.id
          );

          const currentPage = getCurrentPage(tab.id);
          const totalPages = Math.ceil(tabResources.length / itemsPerPage);

          const paginatedResources = tabResources.slice(
            (currentPage - 1) * itemsPerPage,
            currentPage * itemsPerPage
          );

          return (
            <TabsContent
              key={tab.id}
              value={tab.id}
              className="mt-6"
            >
              <div className="grid gap-4 grid-cols-1">
                {paginatedResources.map((resource) =>
                  tab.id === "tutorials" ? (
                    <TutorialResourceCard
                      key={resource.id}
                      resource={resource}
                      onGenerateQuiz={() => {}}
                      docViewToggleFn={() => {}
                      }
                    />
                  ) : (
                    <ResourceCard
                      key={resource.id}
                      resource={resource}
                      resourceType={tab.id}
                      onGenerateQuiz={() => {}}
                      onGenerateAnswers={() => {}}
                      docViewToggleFn={() => {}
                      }
                    />
                  )
                )}
              </div>

              {tabResources.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No {tab.label.toLowerCase()} available yet.
                </div>
              )}

              {totalPages > 1 && (
                <div className="flex justify-between items-center mt-6 gap-2">
                  <span className="text-xs text-gray-600">
                    Page {currentPage} of {totalPages}
                  </span>

                  <div className="flex gap-2 items-center">
                    <Button
                      variant="pagination"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(tab.id, currentPage - 1)}
                    >
                      Prev
                    </Button>
                    <Button
                      variant="pagination"
                      size="sm"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(tab.id, currentPage + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>
          );
        })}

      </Tabs>
    </div>
  );
};

export const DisplayResourceDiv = ({ resources }) => {
  const [activeTab, setActiveTab] = useState<ResourceType>("notes");
  const [page, setPage] = useState<Record<string, number>>({});
  const itemsPerPage = 6;

  const getCurrentPage = (tabId: string) => page["0"] ?? 1;

  const setCurrentPage = (tabId: string, page: number) => {
    setPage(prev => ({
      ...prev,
      ["0"]: page,
    }));
  };

  const currentPage = getCurrentPage("0");
  const totalPages = Math.ceil(resources.length / itemsPerPage);

  const paginatedResources = resources.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="px-6 md:px-0">
      <div>
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          {paginatedResources.map((resource) =>
            resource.resource_types.name === "tutorials" ? (
              <TutorialResourceCard
                key={resource.id}
                resource={resource}
                onGenerateQuiz={() => {}}
                docViewToggleFn={() => {}
                }
              />
            ) : (
              <ResourceCard
                key={resource.id}
                resource={resource}
                resourceType={resource.resource_types.name}
                onGenerateQuiz={() => {}}
                onGenerateAnswers={() => {}}
                docViewToggleFn={() => {}
                }
              />
            )
          )}
        </div>

        {resources.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No resources found
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-6 gap-2">
            <span className="text-xs text-gray-600">
              Page {currentPage} of {totalPages}
            </span>

            <div className="flex gap-2 items-center">
              <Button
                variant="pagination"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage("0", currentPage - 1)}
              >
                Prev
              </Button>
              <Button
                variant="pagination"
                size="sm"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage("0", currentPage + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResourceTabs;
