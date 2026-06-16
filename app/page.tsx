export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      {/* Navbar */}
      <nav className="border-b bg-white/80 dark:bg-gray-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
              G
            </div>
            <span className="font-semibold text-2xl">GrokSite</span>
          </div>
          
          <div className="flex gap-8 text-sm font-medium">
            <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
            <a href="#about" className="hover:text-blue-600 transition-colors">About</a>
            <a href="#contact" className="hover:text-blue-600 transition-colors">Contact</a>
          </div>
          
          <button className="px-5 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all active:scale-95">
            Get Started
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-24 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            ✨ Now in Testing Mode
          </div>
          
          <h1 className="text-6xl md:text-7xl font-bold tracking-tighter mb-6">
            Welcome to the Future
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-10">
            This is a more detailed homepage built for testing. 
            Feel free to modify colors, content, or add new sections.
          </p>

          <div className="flex items-center justify-center gap-4">
            <button className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-semibold text-lg transition-all active:scale-95 shadow-lg shadow-blue-500/30">
              Start Testing
            </button>
            <button className="px-8 py-4 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-900 rounded-2xl font-semibold text-lg transition-all">
              Watch Demo
            </button>
          </div>

          <div className="mt-12 text-sm text-gray-500">
            Built with ❤️ using Next.js + Tailwind
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Awesome Features</h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              Everything you need to test your application
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 hover:border-blue-200 transition-all group">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                ⚡
              </div>
              <h3 className="text-2xl font-semibold mb-3">Lightning Fast</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Built for performance. Optimized components and smooth animations.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 hover:border-blue-200 transition-all group">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                🧪
              </div>
              <h3 className="text-2xl font-semibold mb-3">Testing Ready</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Perfect for development and QA testing with clear sections and components.
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-100 dark:border-gray-700 hover:border-blue-200 transition-all group">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                📱
              </div>
              <h3 className="text-2xl font-semibold mb-3">Fully Responsive</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Looks great on mobile, tablet, and desktop devices.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-6">About This Page</h2>
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-6">
                This homepage was enhanced from your simple version to give you more content 
                and structure to test layouts, responsiveness, dark mode, and interactions.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-green-500 mt-1">✓</span>
                  Modern design with Tailwind CSS
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 mt-1">✓</span>
                  Dark mode support
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 mt-1">✓</span>
                  Smooth hover effects and transitions
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 mt-1">✓</span>
                  Easy to extend with more sections
                </li>
              </ul>
            </div>
            
            <div className="bg-gray-100 dark:bg-gray-800 rounded-3xl aspect-video flex items-center justify-center text-6xl">
              🧪
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <p className="mb-2">Made for tesssssting purposes</p>
          <p className="text-sm">Feel free to customize anything you want!</p>
        </div>
      </footer>
    </main>
  );
}