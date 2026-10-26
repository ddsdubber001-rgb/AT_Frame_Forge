# AT Frame Forge

MASTER PROMPT — AT Frame Forge



Build a complete, professional, responsive anime and movie poster editing web application named AT Frame Forge from scratch.



The application must be a fully functional poster studio, not just a UI mockup. Implement all features, connect every control to real functionality, and make the application ready to run, build, and deploy through GitHub and GitHub Pages.



Do not omit any requirement in this prompt. Plan the architecture carefully and implement all features in a consistent, maintainable way.



1. Brand Identity and Logo



Application name: AT Frame Forge



Create a premium, cinematic, modern anime-poster-studio identity.



- Display the brand name as AT Frame Forge.

- Design a custom logo/wordmark featuring two capital A letters, with both A characters in white.

- Make the two A characters visually distinctive and symmetrical, with a clean, sharp, modern design.

- Keep the logo white against a dark background.

- Use a dark cinematic interface with black, charcoal, and deep navy surfaces, white typography, subtle borders, and restrained accent colours.

- Use a premium professional design inspired by modern creative software, not a generic dashboard template.

- Maintain consistent spacing, typography, buttons, icons, panels, shadows, and border radii.

- Make the complete interface responsive on mobile, tablet, laptop, and desktop.



2. Main Application Workflow



The main workflow must be simple:



1. Upload an anime or movie poster/image.

2. Enter an anime, movie, or series title.

3. Automatically search for and retrieve relevant title information using available APIs.

4. Verify and display the retrieved metadata.

5. Allow the user to correct or edit metadata manually.

6. Choose an overlay template.

7. Edit text, layers, positioning, typography, and colours.

8. View all changes instantly in the poster preview.

9. Export and download the final poster in the selected resolution and format.

10. Save the project and reopen it later.



Preserve the uploaded original artwork as the main poster image. Never replace it with unrelated generated artwork or distort its proportions.



The user must not need to upload the image or enter the title again when switching templates or editing the same project.



3. Image Upload and Image Handling



Support:



- JPG/JPEG

- PNG

- WEBP



Requirements:



- Drag-and-drop upload.

- Browse-file upload.

- Image preview immediately after upload.

- Clear image replacement and removal controls.

- Preserve original aspect ratio.

- Support portrait and landscape artwork.

- Allow image positioning, scaling, cropping, and fit modes.

- Prevent accidental image stretching.

- Maintain sharp image quality.

- Provide appropriate upload errors and file validation.

- Preserve the image while changing layouts, metadata, colours, and typography.



Use the actual uploaded image throughout the editor and export pipeline.



4. Automatic Title Search and Metadata Collection



When the user enters a title, search for the most relevant anime, movie, or series.



Use suitable existing or properly configured public metadata APIs, such as:



- AniList for anime information.

- Jikan as an alternative anime metadata source.

- TMDB for movie and television metadata, when an API key is configured.



Requirements:



- Search for matching titles.

- Display multiple search results when the title is ambiguous.

- Allow the user to select the correct result.

- Prefer reliable source data and avoid inventing missing details.

- Handle API failures, rate limits, missing fields, and network errors gracefully.

- Keep API requests separate from presentation components.

- Store API keys in appropriate environment variables where supported; never expose private secrets in client-side code.

- Do not break the application if one API is unavailable.



Retrieve relevant fields when available:



- Official title.

- Alternative titles.

- Release year and full release date.

- Anime season and episode information.

- Movie or series type.

- Runtime or episode duration.

- Number of episodes and seasons.

- Genres.

- Synopsis.

- Release status.

- Original language.

- Available audio or language information, only when supported by a reliable source.

- Studio or production company.

- Age rating or content classification, when available.

- User or source rating, clearly labelled.

- Poster or backdrop images from the metadata source, where useful.



Allow manual editing of every displayed metadata field.



Do not fabricate ratings, studios, dates, episode counts, audio availability, or other facts. Hide unavailable fields or let the user enter corrections.



5. Multiple Overlay Templates



Implement a genuine multi-template system with independently designed layouts.



The application must include at least these two core templates from the beginning.



Layout 1 — Classic Cinematic Overlay



Create a polished version of the standard anime/movie poster overlay.



Include configurable elements such as:



- Main title.

- Subtitle or alternative title.

- Release year.

- Type: Anime, Movie, Series, or other relevant category.

- Season and episode information when relevant.

- Runtime or episode duration when available.

- Genres.

- Rating.

- Release status.

- Language information when available.

- Short description or synopsis.

- Cinematic gradient overlays.

- Optional accent-colour highlights.



Keep the poster artwork prominent and ensure all text is readable.



Layout 2 — Reference-Inspired Split Information Design



Create a genuinely different second layout inspired by the user's reference poster design.



This must be a separate working design, not just a different button, border, colour, or title position.



Design requirements:



- Large portrait poster artwork on the left.

- Cinematic information panel on the right.

- Blurred background derived from the uploaded artwork.

- Dark gradient treatment for readability.

- Clear hierarchy between the main title and supporting information.

- Information cards for genres, release date, status, season, runtime, studio, and rating when available.

- Short synopsis with controlled line wrapping.

- Balanced spacing and alignment.

- Premium cinematic styling.

- Responsive behaviour that adapts to different canvas sizes.



Do not invent metadata to fill empty spaces.



Additional Template System



Build the architecture so more templates can be added without rewriting the editor.



Provide:



- A visible template gallery.

- Template thumbnails or miniature previews.

- Clear template names.

- A visible selected-template state.

- Live preview when switching templates.

- Consistent access to editing and export controls.



Switching layouts must preserve the image, metadata, project, and user-entered changes.



Each template must have its own actual rendering logic. The selected template must control both the live preview and final exported image.



6. Layer Editor and Drag Controls



Create a functional layer editor for poster elements.



Supported layers should include:



- Uploaded image.

- Background.

- Main title.

- Subtitle.

- Metadata labels.

- Metadata values.

- Genre tags.

- Rating badge.

- Information cards.

- Decorative shapes and accents.

- Other overlay elements.



Features:



- Select a layer.

- Drag and reposition layers.

- Resize supported elements.

- Adjust alignment.

- Reorder layers forward and backward.

- Hide and show layers.

- Lock and unlock layers.

- Delete removable layers.

- Duplicate supported layers.

- Edit text content.

- Adjust opacity where applicable.

- Reset an element to its default position.

- Undo and redo changes.

- Reset the layout when requested.



Show clear selection outlines and handles while editing, but do not include editor handles in the exported poster.



Keep layer controls synchronized with the selected template. Avoid allowing an element to disappear from the export because the editor and renderer use different states.



7. Advanced Typography and Text Effects



Provide a typography panel for editable text layers.



Controls should include:



- Font family.

- Font size.

- Font weight.

- Text colour.

- Text alignment.

- Letter spacing.

- Line height.

- Text wrapping.

- Text positioning.

- Text rotation where appropriate.

- Text opacity.

- Text shadow.

- Outline or stroke.

- Glow effects.

- Gradient text where supported.

- Background or highlight behind text.

- Reset typography to defaults.



Use readable fonts and preserve the visual hierarchy of cinematic posters.



Typography changes must appear immediately in the preview and remain consistent in the downloaded image.



Prevent text from unintentionally overflowing its assigned area. Allow the user to adjust size, wrapping, and positioning manually.



Use appropriate Unicode-capable fonts for Tamil, English, and Japanese text.



8. Smart Colour Palette



Implement a smart colour-palette feature based on the uploaded artwork.



Requirements:



- Extract or estimate dominant colours from the uploaded image.

- Suggest complementary accent colours.

- Provide suitable text colours with readable contrast.

- Offer coordinated colour combinations for badges, information cards, borders, and highlights.

- Include dark, neutral, and vibrant palette choices.

- Allow manual colour selection.

- Provide a reset-to-default option.

- Apply selected colours consistently to supported elements.

- Keep the original poster artwork unchanged unless the user explicitly edits the image itself.



Palette changes must update the live preview and exported output.



9. High-Resolution Export



Implement a real poster export pipeline that renders the complete selected design.



Supported export formats:



- PNG.

- JPG/JPEG.

- WEBP.



Provide export presets including:



- 1080p.

- 4K: 3840 × 2160 for a 16:9 canvas.

- High-resolution portrait export suitable for poster artwork.

- Custom width and height.



For portrait posters, use a suitable portrait canvas preset such as 2160 × 3840 when selected. Do not force portrait artwork into a landscape aspect ratio.



Requirements:



- Preserve the chosen aspect ratio unless the user explicitly chooses another canvas.

- Use high-quality image scaling.

- Keep text sharp.

- Render all visible poster layers in the correct order.

- Include the selected overlay design, typography, gradients, badges, and information cards.

- Respect layer visibility, opacity, position, size, and styling.

- Respect the selected export dimensions and format.

- Support transparent backgrounds only where appropriate and requested.

- Provide a clear download button and export progress or error feedback.



The exported file must contain the complete poster design, not just the original uploaded image or a screenshot of the editor interface.



Do not claim to provide 4K export if the renderer only saves the original image at its original dimensions. Implement genuine high-resolution rendering.



10. Auto-Save and Project Library



Implement project persistence.



Each project should store, where appropriate:



- Project name.

- Uploaded artwork or a reliably recoverable image reference.

- Selected metadata and manual corrections.

- Selected overlay template.

- Layer positions and settings.

- Typography settings.

- Colour palette.

- Canvas dimensions and aspect ratio.

- Export preferences.

- Last-edited timestamp.



Features:



- Automatic saving after meaningful changes.

- A visible saving/saved/error indicator.

- A project library page or panel.

- Create a new project.

- Open an existing project.

- Rename a project.

- Duplicate a project.

- Delete a project after confirmation.

- Search or filter saved projects.

- Display project thumbnails and last-edited dates.

- Recover projects after refreshing or reopening the application.



Use an appropriate persistence strategy. Local browser storage may be used for a first working version, but handle storage limits and large images safely. Do not silently lose a project when storage fails.



If cloud saving requires authentication or a backend, implement it only when configured and clearly communicate any setup requirements. Do not create fake cloud-sync controls.



11. Batch Poster Creation



Add a batch-processing workflow for creating multiple posters efficiently.



Requirements:



- Upload or select multiple images.

- Associate each image with a title.

- Fetch metadata for each title.

- Allow users to review and correct individual results.

- Select one template for multiple posters or configure posters individually.

- Apply reusable typography and palette settings.

- Show per-item processing status.

- Allow an individual poster to be previewed and edited.

- Export a selected poster or all successfully processed posters.

- Provide ZIP download for multiple exports where supported.

- Handle failed metadata searches or exports without losing successful items.

- Avoid excessive simultaneous API requests; use controlled processing and respect rate limits.



Batch processing must use the same real preview and export renderer as single-poster creation.



12. Tamil, English, and Japanese Language Support



Support text entry and rendering in:



- Tamil.

- English.

- Japanese.



Requirements:



- Correct Unicode handling.

- Suitable font fallbacks for each script.

- Correct rendering of Tamil characters and combining marks.

- Correct Japanese glyph rendering.

- Proper line wrapping and alignment.

- No broken characters or missing-glyph boxes where supported fonts are available.

- Allow mixed-language titles and descriptions.

- Keep text editable.

- Preserve selected text in saved projects.

- Ensure all three languages render correctly in the preview and exported PNG/JPG/WEBP files.



Do not translate official titles or metadata automatically unless the user explicitly requests translation. Preserve the text provided by the source or entered by the user.



13. User Interface and Pages



Create a complete interface with:



- Brand header featuring the white double-A logo and AT Frame Forge wordmark.

- Main dashboard.

- Poster editor.

- Image upload area.

- Title search and metadata editor.

- Template gallery.

- Live poster preview.

- Layer panel.

- Typography panel.

- Colour palette panel.

- Export settings.

- Project library.

- Batch creation page or panel.

- Clear loading, empty, success, and error states.



Use a sensible editor layout:



- Left panel: image upload, metadata, and project controls.

- Centre: large poster canvas and live preview.

- Right panel: template, layers, typography, and colour controls.



On mobile devices, reorganize these panels into a usable stacked or tabbed interface without hiding essential functionality.



Keep controls readable, buttons functional, and editing interactions accessible.



14. Technical Requirements



- Use a maintainable React and TypeScript architecture with reusable components.

- Use the existing project's framework and dependencies where available; avoid unnecessary migrations.

- Separate metadata services, state management, template rendering, layer editing, persistence, and export logic.

- Use type-safe models for metadata, projects, templates, and layers.

- Keep preview and export rendering consistent.

- Avoid duplicated state that causes preview/export mismatches.

- Handle API errors, invalid inputs, and storage errors.

- Avoid placeholder buttons and fake functionality.

- Do not hardcode fake metadata or pretend that an API request succeeded.

- Keep secrets out of public client-side source code.

- Provide clear setup instructions for any required API keys.

- Ensure the project builds without TypeScript errors or missing imports.

- Include all required configuration files and a working build script.

- Do not leave unfinished TODOs for essential features.

- Do not remove working functionality when adding new features.



15. GitHub and GitHub Pages Deployment



Prepare the project for GitHub and GitHub Pages deployment.



Requirements:



- Use the correct repository base path for deployment.

- Configure the build tool appropriately for the repository.

- Include a working GitHub Actions workflow to build and deploy the application.

- Ensure required dependencies are declared.

- Ensure asset paths work after deployment to a project subpath.

- Resolve routing issues that could cause refreshes or direct page visits to fail.

- Keep local development and production builds working.

- Document any environment variables and external API setup needed.

- Do not claim deployment is successful unless the build and deployment workflow have actually passed.



16. Final Testing Checklist



Before declaring the project complete, verify the following:



1. The application displays the exact name AT Frame Forge.

2. The logo has two A characters in white.

3. Image upload works for JPG, PNG, and WEBP.

4. Title search and metadata retrieval work with configured sources.

5. Metadata can be edited manually.

6. Layout 1 renders the classic overlay.

7. Layout 2 renders a genuinely different reference-inspired split design.

8. Switching templates preserves the image and metadata.

9. Layer selection, positioning, visibility, and ordering work.

10. Typography controls update the preview.

11. Smart palette changes update the design.

12. Undo, redo, and reset work where implemented.

13. PNG, JPG, and WEBP export work.

14. High-resolution landscape and portrait exports use the requested dimensions.

15. The export contains the full selected overlay design.

16. Projects save and reopen correctly.

17. Batch creation processes multiple posters.

18. Tamil, English, and Japanese text render correctly in preview and exports.

19. Mobile and desktop layouts are usable.

20. The production build completes without errors.

21. The GitHub Actions deployment workflow is configured and its actual status is reported honestly.



17. Implementation Rules



- Implement the complete application, not only a plan, design mockup, or static preview.

- Do not skip the second template.

- Do not make template selection merely decorative.

- Do not let the preview and export use different designs or different data.

- Do not discard the user's uploaded artwork when changing templates.

- Do not invent metadata.

- Do not claim a feature has been tested unless it has actually been tested.

- Do not hide incomplete functionality behind buttons that appear operational.

- Prioritize a stable, integrated implementation over disconnected features.

- If a feature depends on an external API key, backend, or unsupported environment capability, implement the usable parts and clearly state the exact setup required.

- After implementation, summarize the files created or changed, features completed, tests actually performed, any remaining limitations, and the steps needed to run and deploy the application.



Final goal: Deliver a complete, professional anime and movie poster creation studio called AT Frame Forge, with the white double-A branding, two working core overlay templates, advanced layer and typography editing, smart colours, high-resolution export, project saving, batch processing, and Tamil/English/Japanese support—all integrated into one reliable application.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/b2c4b543-0506-4ace-979a-8e5648830e1c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
