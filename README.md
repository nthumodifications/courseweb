![Frame 3](https://github.com/nthumodifications/courseweb/assets/74640729/c810b72f-e428-47bc-8f5b-22a49c4eb1a0)

# 國立清華大學非公式的開源預排，選課，課表網站.

The unofficial open-source course preselection, timetable builder, and course catalog website!

We are a passionate team of students dedicated to improving the technological standards of NTHU through students. We hope that with our efforts and yours, we'll make NTHU great again!

Since its inception, NTHUMods has been continuously enhanced with features like:

- 📚 Course Selector
- 📅 Timetable Builder
- 📝 Course Reviews
- 🚍 Bus Schedule
- ⛓️‍💥 NTHU CCXP Linking
- 📱 Mobile Support
- 🌐 Multi-Language Support

The platform has gained significant traction, now boasting over 1,500 users. It is proudly supported under NTHU IDEAL, CLC, and CLL projects.
Follow more updates on [Instagram](https://www.instagram.com/nthumods/)

## Technologies Used

- React
- Next.js
- Node.js
- Supabase
- Firebase
- DigitalOcean

> **Note**
> This Repository is under heavy development, expect to have breaking changes!

## Usage

Currently, everyone can access the website at [NTHUMods](https://nthumods.com). If theres any issues/features you would like to see, feel free to open an issue [here](https://github.com/nthumodifications/courseweb/issues/new/choose).

## Development

You can clone the repository and start the development server via `npm run dev`

If you wish to participate in this development, feel free to email [nthumods@gmail.com](mailto:nthumods@gmail.com) in the meantime while we figure out the system for contributing.

Translation Dictionary Management Script `npm run dict --` to manage the translation dictionary. Eg `npm run dict -- create settings.ais.login 登入 Login`

## Contributing

We welcome contributions from everyone, regardless of experience level. Here’s how you can get started:

1. **Fork the Repository**: Click the fork button on this repository to create a copy under your GitHub account.

2. **Clone Your Fork**:

   ```bash
   git clone https://github.com/your-username/courseweb.git
   cd courseweb
   npm install
   npm run dev-turbo
   ```

3. **Create a Branch**:

   ```bash
   git checkout -b my-feature/bugfix

   ```

4. **Make Changes**:

   - Add your changes to the codebase.
   - Make sure to test your changes locally by running `npm run dev-turbo`.

5. **Commit Your Changes**:

   ```bash
   git add .
   git commit -m "Your message here"
   ```

   > We recommend that you use a present-tense commit message that describes what the commit does. And follow [Commit Message Convention](https://www.conventionalcommits.org/en/v1.0.0/)

6. **Push Your Changes**:

   ```bash
   git push origin my-feature/bugfix
   ```

7. **Open a Pull Request**:
   - Open a pull request to the `main` branch of this repository.
   - Make sure to give a descriptive title and description for your pull request, following a similar format with commit messages.
   - If your pull request fixes an issue, make sure to link the issue in the pull request description.
   - Wait for the maintainers to review your pull request.

## Deployment

Deployment is currently hosted on DigitalOcean, and tested with Vercel. If you wish to deploy your version, you can do so by forking this repository and deploying it on Vercel. `.env.local` must be populated according to `.env.local.example`

## License

We are LICENSED under the GNU General Public License v3.0. You can view the license [here](https://github.com/nthumodifications/courseweb/blob/eff77192c989cf277be1e94660f8e0cf0304b492/LICENSE). Learn more about it [here](https://gist.github.com/kn9ts/cbe95340d29fc1aaeaa5dd5c059d2e60)

## Authors

- [Chew Tzi Hwee](@ImJustChew)
- [Joshua Lean](@Joshimello)
- [Huang Shi Jie](@SJieNg123)

## Acknowledgements

[National Tsing Hua University Interdisciplinary Program](https://ipth.site.nthu.edu.tw/p/406-1462-267815,r9940.php) - Acknowledging and supporting the project

## Inspiration

[NUSMods](https://nusmods.com) - The National University of Singapore's Website. The obvious lack of spirit in NTHU's website is what inspired us to create this project.
