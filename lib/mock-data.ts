/**
 * Mock data for local UI development
 * 
 * Usage: Set NEXT_PUBLIC_USE_MOCK_DATA=true in your local .env file
 * This allows UI iteration without consuming API credits
 * 
 * NOTE: This file should NOT be included when merging UI changes to production.
 * Only the UI component changes should be merged.
 */

// Client-safe type definitions (avoid importing from types.ts which uses zod)
export type ContentModel = {
  name: string;
  fields: Array<{ name: string; type: string; description?: string }>;
  description?: string;
};

export type UIComponent = {
  name: string;
  selector: string;
  slots: Array<{ name: string; selector: string; type: string; description?: string }>;
  variants?: string[];
  description?: string;
};

export type PageMapping = {
  pageName: string;
  componentMappings: Array<{
    componentName: string;
    slotMappings: Record<string, string>;
  }>;
};

export type AnalysisResult = {
  contentModels: ContentModel[];
  uiComponents: UIComponent[];
  mappings: PageMapping[];
  metadata: {
    url: string;
    timestamp: string;
    screenshotPath?: string;
  };
};

export type WebflowExport = {
  collections: Array<{
    name: string;
    slug: string;
    fields: Array<{ name: string; type: string; slug: string }>;
  }>;
  symbols: Array<{
    name: string;
    componentName: string;
    bindings: Record<string, string>;
  }>;
  pages: Array<{
    name: string;
    slug: string;
    symbolInstances: Array<{ symbolName: string; collectionBinding?: string }>;
  }>;
  csvData?: Record<string, Array<Record<string, unknown>>>;
};

export const mockAnalysis: AnalysisResult = {
  contentModels: [
    {
      name: "BlogPost",
      description: "Blog article content",
      fields: [
        { name: "title", type: "string", description: "Article headline" },
        { name: "excerpt", type: "string", description: "Short summary" },
        { name: "featuredImage", type: "image", description: "Hero image" },
        { name: "author", type: "string", description: "Author name" },
        { name: "publishDate", type: "string", description: "Publication date" },
        { name: "readTime", type: "number", description: "Estimated read time in minutes" },
      ],
    },
    {
      name: "TeamMember",
      description: "Team member profile",
      fields: [
        { name: "name", type: "string", description: "Full name" },
        { name: "role", type: "string", description: "Job title" },
        { name: "bio", type: "string", description: "Short biography" },
        { name: "photoUrl", type: "image", description: "Profile photo" },
        { name: "linkedIn", type: "url", description: "LinkedIn profile URL" },
      ],
    },
    {
      name: "Feature",
      description: "Product feature",
      fields: [
        { name: "title", type: "string", description: "Feature name" },
        { name: "description", type: "string", description: "Feature description" },
        { name: "icon", type: "image", description: "Feature icon" },
      ],
    },
  ],
  uiComponents: [
    {
      name: "BlogCard",
      selector: ".blog-card",
      description: "Card displaying blog post preview",
      slots: [
        { name: "image", selector: ".blog-card__image", type: "image" },
        { name: "title", selector: ".blog-card__title", type: "text" },
        { name: "excerpt", selector: ".blog-card__excerpt", type: "text" },
        { name: "author", selector: ".blog-card__author", type: "text" },
        { name: "date", selector: ".blog-card__date", type: "text" },
      ],
    },
    {
      name: "TeamCard",
      selector: ".team-card",
      description: "Team member profile card",
      slots: [
        { name: "photo", selector: ".team-card__photo", type: "image" },
        { name: "name", selector: ".team-card__name", type: "text" },
        { name: "role", selector: ".team-card__role", type: "text" },
        { name: "bio", selector: ".team-card__bio", type: "text" },
        { name: "socialLink", selector: ".team-card__social", type: "link" },
      ],
    },
    {
      name: "FeatureBlock",
      selector: ".feature-block",
      description: "Feature highlight section",
      slots: [
        { name: "icon", selector: ".feature-block__icon", type: "image" },
        { name: "heading", selector: ".feature-block__heading", type: "text" },
        { name: "body", selector: ".feature-block__body", type: "text" },
      ],
    },
  ],
  mappings: [
    {
      pageName: "Homepage",
      componentMappings: [
        {
          componentName: "BlogCard",
          slotMappings: {
            image: "BlogPost.featuredImage",
            title: "BlogPost.title",
            excerpt: "BlogPost.excerpt",
            author: "BlogPost.author",
            date: "BlogPost.publishDate",
          },
        },
        {
          componentName: "FeatureBlock",
          slotMappings: {
            icon: "Feature.icon",
            heading: "Feature.title",
            body: "Feature.description",
          },
        },
      ],
    },
    {
      pageName: "About",
      componentMappings: [
        {
          componentName: "TeamCard",
          slotMappings: {
            photo: "TeamMember.photoUrl",
            name: "TeamMember.name",
            role: "TeamMember.role",
            bio: "TeamMember.bio",
            socialLink: "TeamMember.linkedIn",
          },
        },
      ],
    },
  ],
  metadata: {
    url: "https://example.com",
    timestamp: new Date().toISOString(),
    screenshotPath: "https://placehold.co/1280x800/1a1a2e/ffffff?text=Mock+Screenshot",
  },
};

export const mockWebflowExport: WebflowExport = {
  collections: [
    {
      name: "Blog Posts",
      slug: "blog-posts",
      fields: [
        { name: "Title", type: "PlainText", slug: "title" },
        { name: "Excerpt", type: "PlainText", slug: "excerpt" },
        { name: "Featured Image", type: "ImageRef", slug: "featured-image" },
        { name: "Author", type: "PlainText", slug: "author" },
        { name: "Publish Date", type: "Date", slug: "publish-date" },
        { name: "Read Time", type: "Number", slug: "read-time" },
      ],
    },
    {
      name: "Team Members",
      slug: "team-members",
      fields: [
        { name: "Name", type: "PlainText", slug: "name" },
        { name: "Role", type: "PlainText", slug: "role" },
        { name: "Bio", type: "PlainText", slug: "bio" },
        { name: "Photo", type: "ImageRef", slug: "photo" },
        { name: "LinkedIn", type: "Link", slug: "linkedin" },
      ],
    },
    {
      name: "Features",
      slug: "features",
      fields: [
        { name: "Title", type: "PlainText", slug: "title" },
        { name: "Description", type: "PlainText", slug: "description" },
        { name: "Icon", type: "ImageRef", slug: "icon" },
      ],
    },
  ],
  symbols: [
    {
      name: "Blog Card Symbol",
      componentName: "BlogCard",
      bindings: {
        image: "blog-posts.featured-image",
        title: "blog-posts.title",
        excerpt: "blog-posts.excerpt",
        author: "blog-posts.author",
        date: "blog-posts.publish-date",
      },
    },
    {
      name: "Team Card Symbol",
      componentName: "TeamCard",
      bindings: {
        photo: "team-members.photo",
        name: "team-members.name",
        role: "team-members.role",
        bio: "team-members.bio",
        socialLink: "team-members.linkedin",
      },
    },
    {
      name: "Feature Block Symbol",
      componentName: "FeatureBlock",
      bindings: {
        icon: "features.icon",
        heading: "features.title",
        body: "features.description",
      },
    },
  ],
  pages: [
    {
      name: "Homepage",
      slug: "home",
      symbolInstances: [
        { symbolName: "Blog Card Symbol", collectionBinding: "blog-posts" },
        { symbolName: "Feature Block Symbol", collectionBinding: "features" },
      ],
    },
    {
      name: "About",
      slug: "about",
      symbolInstances: [
        { symbolName: "Team Card Symbol", collectionBinding: "team-members" },
      ],
    },
  ],
};
