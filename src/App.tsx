import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './components/Navigation';
import Hero from './components/Hero';
import MenuPage from './components/Menu/MenuPage';
import TastingMenusAdmin from './components/Admin/Menu/TastingMenusAdmin';
import FoodCategoriesAdmin from './components/Admin/Menu/FoodCategoriesAdmin';
import FoodItemsAdmin from './components/Admin/Menu/FoodItemsAdmin';
import DrinkCategoriesAdmin from './components/Admin/Menu/DrinkCategoriesAdmin';
import DrinkItemsAdmin from './components/Admin/Menu/DrinkItemsAdmin';
import EventsAdmin from './components/Admin/EventsAdmin';
import JobsAdmin from './components/Admin/JobsAdmin';
import DepartmentsAdmin from './components/Admin/DepartmentsAdmin';
import JobTypesAdmin from './components/Admin/JobTypesAdmin';
import ApplicationsAdmin from './components/Admin/ApplicationsAdmin';
import InvestorSubmissionsAdmin from './components/Admin/InvestorSubmissionsAdmin';
import LoginPage from './components/Auth/LoginPage';
import MenuDrawer from './components/Menu/MenuDrawer';
import ContentDrawer from './components/Drawers/ContentDrawer';
import Events from './components/Content/Events';
import About from './components/Content/About';
import Contact from './components/Content/Contact';
import Visit from './components/Content/Visit';
import ReservationsDrawer from './components/Reservations/ReservationsDrawer';
import InvestorDrawer from './components/Drawers/InvestorDrawer';
import Footer from './components/Footer';
import TermsOfUse from './components/Legal/TermsOfUse';
import PrivacyPolicy from './components/Legal/PrivacyPolicy';
import CareersDrawer from './components/Careers/CareersDrawer';
import ApplicationForm from './components/Careers/ApplicationForm';
import AdminLayout from './components/Admin/AdminLayout';
import Dashboard from './components/Admin/Dashboard';
import ImageManager from './components/Admin/ImageManager';
import Settings from './components/Admin/Settings';

function App() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isEventsOpen, setIsEventsOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isVisitOpen, setIsVisitOpen] = useState(false);
  const [isReservationsOpen, setIsReservationsOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isCareersOpen, setIsCareersOpen] = useState(false);
  const [isInvestorOpen, setIsInvestorOpen] = useState(false);

  return (
    <Router basename={import.meta.env.BASE_URL}>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/"
          element={
            <div className="min-h-screen bg-gray-50 relative">
              <Navigation 
                onOpenMenu={() => setIsMenuOpen(true)}
                onOpenEvents={() => setIsEventsOpen(true)}
                onOpenAbout={() => setIsAboutOpen(true)}
                onOpenContact={() => setIsContactOpen(true)}
                onOpenVisit={() => setIsVisitOpen(true)}
                onOpenInvestor={() => setIsInvestorOpen(true)}
              />
              <Hero 
                onOpenMenu={() => setIsMenuOpen(true)} 
                onOpenReservations={() => setIsReservationsOpen(true)}
              />
              <MenuDrawer isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
              <ContentDrawer isOpen={isEventsOpen} onClose={() => setIsEventsOpen(false)} title="Events">
                <Events />
              </ContentDrawer>
              <ContentDrawer isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} title="About Us">
                <About />
              </ContentDrawer>
              <ContentDrawer isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} title="Contact">
                <Contact 
                  onOpenReservations={() => {
                    setIsContactOpen(false);
                    setIsReservationsOpen(true);
                  }}
                  onOpenEvents={() => {
                    setIsContactOpen(false);
                    setIsEventsOpen(true);
                  }}
                />
              </ContentDrawer>
              <ContentDrawer isOpen={isVisitOpen} onClose={() => setIsVisitOpen(false)} title="Visit Us">
                <Visit />
              </ContentDrawer>
              <ContentDrawer isOpen={isReservationsOpen} onClose={() => setIsReservationsOpen(false)} title="Reservations">
                <ReservationsDrawer />
              </ContentDrawer>
              <ContentDrawer isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} title="Terms of Use">
                <TermsOfUse />
              </ContentDrawer>
              <ContentDrawer isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} title="Privacy Policy">
                <PrivacyPolicy />
              </ContentDrawer>
              <ContentDrawer isOpen={isCareersOpen} onClose={() => setIsCareersOpen(false)} title="Careers">
                <CareersDrawer />
              </ContentDrawer>
              <InvestorDrawer isOpen={isInvestorOpen} onClose={() => setIsInvestorOpen(false)} />
              <Footer 
                onOpenTerms={() => setIsTermsOpen(true)}
                onOpenPrivacy={() => setIsPrivacyOpen(true)}
                onOpenCareers={() => setIsCareersOpen(true)}
              />
            </div>
          }
        />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/careers/apply" element={<ApplicationForm />} />
        <Route path="/admin/login" element={<LoginPage />} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminLayout><Dashboard /></AdminLayout>} />
        
        {/* Menu Management Routes */}
        <Route path="/admin/menu/tasting-menus" element={<AdminLayout><TastingMenusAdmin /></AdminLayout>} />
        <Route path="/admin/menu/food-categories" element={<AdminLayout><FoodCategoriesAdmin /></AdminLayout>} />
        <Route path="/admin/menu/food-items" element={<AdminLayout><FoodItemsAdmin /></AdminLayout>} />
        <Route path="/admin/menu/drink-categories" element={<AdminLayout><DrinkCategoriesAdmin /></AdminLayout>} />
        <Route path="/admin/menu/drink-items" element={<AdminLayout><DrinkItemsAdmin /></AdminLayout>} />
        
        <Route path="/admin/events" element={<AdminLayout><EventsAdmin /></AdminLayout>} />
        <Route path="/admin/images" element={<AdminLayout><ImageManager /></AdminLayout>} />
        
        {/* Career Management Routes */}
        <Route path="/admin/jobs" element={<AdminLayout><JobsAdmin /></AdminLayout>} />
        <Route path="/admin/departments" element={<AdminLayout><DepartmentsAdmin /> </AdminLayout>} />
        <Route path="/admin/job-types" element={<AdminLayout><JobTypesAdmin /></AdminLayout>} />
        <Route path="/admin/applications" element={<AdminLayout><ApplicationsAdmin /></AdminLayout>} />
        
        {/* Investment Management Route */}
        <Route path="/admin/investor-submissions" element={<AdminLayout><InvestorSubmissionsAdmin /></AdminLayout>} />
        
        <Route path="/admin/settings" element={<AdminLayout><Settings /></AdminLayout>} />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
