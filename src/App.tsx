import { useEffect } from 'react'
import { BrowserRouter, Link, Route, Routes, useLocation, useParams } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import Loader from './components/Loader'
import Home from './pages/Home'
import Annonces from './pages/Annonces'
import AnnonceDetail from './pages/AnnonceDetail'
import CategoryPage from './pages/CategoryPage'
import Incubation from './pages/Incubation'
import Blog from './pages/Blog'
import BlogArticle from './pages/BlogArticle'
import FAQ from './pages/FAQ'
import Contact from './pages/Contact'
import Admin from './pages/admin/Admin'
import LegalPage from './pages/LegalPage'
import Panier from './pages/Panier'
import Commande from './pages/Commande'
import Confirmation from './pages/Confirmation'
import { CartProvider } from './lib/cart'

function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' })
    } else {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior })
    }
  }, [pathname, hash])
  return null
}

function LegalRoute() {
  const { slug } = useParams()
  return <LegalPage slug={slug ?? ''} />
}

function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-28 text-center">
      <p className="font-display text-7xl font-semibold text-terra-soft">404</p>
      <h1 className="mt-4 font-display text-3xl font-semibold text-bark">Page introuvable</h1>
      <p className="mt-3 text-bark-soft">Cette page n’existe pas… ou plus.</p>
      <Link
        to="/"
        className="btn mt-8 inline-block rounded-full bg-terra px-7 py-3.5 text-sm font-semibold text-cream hover:bg-terra-dark"
      >
        Retour à l’accueil
      </Link>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <CartProvider>
      <ScrollToTop />
      <Loader />
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/annonces" element={<Annonces />} />
            <Route path="/annonces/:id" element={<AnnonceDetail />} />
            <Route path="/categories/:slug" element={<CategoryPage />} />
            <Route path="/incubation" element={<Incubation />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/blog/:slug" element={<BlogArticle />} />
            <Route path="/faq" element={<FAQ />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/panier" element={<Panier />} />
            <Route path="/commande" element={<Commande />} />
            <Route path="/commande/confirmation" element={<Confirmation />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/legal/:slug" element={<LegalRoute />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </div>
      </CartProvider>
    </BrowserRouter>
  )
}
