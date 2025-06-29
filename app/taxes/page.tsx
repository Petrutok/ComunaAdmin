"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Home,
  Receipt,
  CreditCard,
  AlertCircle,
  FileText,
  Car,
  Banknote,
  Shield,
  ExternalLink,
  Info,
  ArrowRight,
  CheckCircle
} from 'lucide-react';

export default function TaxesPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="p-4 max-w-7xl mx-auto">
        {/* Home Button */}
        <button
 onClick={() => window.location.href = '/'}
  className="fixed top-4 left-4 z-50 group"
>
  <div className="bg-white/10 backdrop-blur-md text-white rounded-xl px-5 py-2.5 shadow-2xl hover:bg-white/20 transition-all duration-300 flex items-center gap-2.5 font-medium border border-white/20 hover:scale-105">
    <Home className="h-5 w-5 group-hover:scale-110 transition-transform" />
    <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent font-semibold">
      Acasă
    </span>
  </div>
  {/* Glow effect */}
  <div className="absolute inset-0 rounded-xl bg-white/20 blur-xl opacity-0 group-hover:opacity-50 transition-opacity -z-10"></div>
          </button>



        {/* Header */}
        <div className="text-center pt-20 pb-10">
          <div className="inline-flex items-center justify-center p-3 bg-purple-500 rounded-xl mb-6">
            <Receipt className="h-8 w-8 text-white" />
          </div>
          
          <h1 className="text-5xl font-bold text-white mb-4">
            Plată Impozite și Taxe
          </h1>
          
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Sistemul Național de Plăți Online a Taxelor și Impozitelor prin platforma Ghiseul.ro
          </p>
        </div>

        {/* Main Content */}
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Plată Amenzi */}
          <Card className="bg-slate-800 border-slate-700 overflow-hidden flex flex-col h-full">
            <div className="bg-gradient-to-r from-orange-500 to-red-500 h-2"></div>
            <CardHeader className="pb-6 flex-grow-0">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold text-white mb-2">
                    
                    PLATĂ AMENZI
                  </CardTitle>
                  <CardDescription className="text-gray-300 text-base">
                    Plata online a amenzilor se poate efectua fără cont în portalul Ghiseul.ro
                  </CardDescription>
                </div>
                <div className="bg-slate-700 p-3 rounded-lg">
                  <AlertCircle className="h-8 w-8 text-orange-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col flex-grow">
              <div className="space-y-4 mb-6 flex-grow">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-300">
                    Plata se poate efectua fără cont, cu informațiile din procesul verbal
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-300">
                    Confirmarea plății se va trimite pe adresa de e-mail
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-300">
                    Pentru plata amenzilor nu sunt necesare date de acces (utilizator și parolă)
                  </p>
                </div>
              </div>
              
              <a 
                href="https://www.ghiseul.ro/ghiseul/public/amenzi"
                target="_blank"
                rel="noopener noreferrer"
                className="block mt-auto"
              >
                <Button className="w-full bg-white text-slate-900 hover:bg-gray-100 font-semibold shadow-md hover:shadow-xl transition-all duration-200 py-3 text-base">
                  Plătește amenzile prin Ghiseul.ro
                  <ExternalLink className="ml-2 h-5 w-5" />
                </Button>
              </a>
            </CardContent>
          </Card>

          {/* Plată Taxe și Impozite */}
          <Card className="bg-slate-800 border-slate-700 overflow-hidden flex flex-col h-full">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2"></div>
            <CardHeader className="pb-6 flex-grow-0">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold text-white mb-2">
                    PLATĂ TAXE ȘI IMPOZITE
                  </CardTitle>
                  <CardDescription className="text-gray-300 text-base">
                    Pentru plata online a taxelor și impozitelor este necesar să accesezi Ghiseul.ro
                  </CardDescription>
                </div>
                <div className="bg-slate-700 p-3 rounded-lg">
                  <Banknote className="h-8 w-8 text-blue-400" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col flex-grow">
              <div className="space-y-4 mb-6 flex-grow">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-300">
                    Se poate plăti și fără autentificare, dacă se cunoaște suma de plată
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-300">
                    Datele de acces pot fi solicitate online, folosind cardul bancar
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                  <p className="text-gray-300">
                    Doar persoanele fizice pot solicita date de acces
                  </p>
                </div>
              </div>
              
              <a 
                href="https://www.ghiseul.ro/ghiseul/public/"
                target="_blank"
                rel="noopener noreferrer"
                className="block mt-auto"
              >
                <Button className="w-full bg-white text-slate-900 hover:bg-gray-100 font-semibold shadow-md hover:shadow-xl transition-all duration-200 py-3 text-base">
                  Plătește taxe și impozite prin Ghiseul.ro
                  <ExternalLink className="ml-2 h-5 w-5" />
                </Button>
              </a>
            </CardContent>
          </Card>
        </div>

        {/* Additional Services */}
        <Card className="bg-slate-800 border-slate-700 mb-8">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white">
              Alte servicii disponibile online
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <a 
                href="https://registratura.rejust.ro/plata-taxei-judiciare-de-timbru-intr-un-dosar-existent?"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors cursor-pointer"
              >
                <FileText className="h-6 w-6 text-gray-400" />
                <span className="text-gray-300">Taxă judiciară de timbru</span>
                <ExternalLink className="h-4 w-4 text-gray-400 ml-auto" />
              </a>
              <a 
                href="https://www.ghiseul.ro/ghiseul/public/taxe/taxe-speciale/id/eyJpZEluc3QiOiA3MjEyLCAidGlwUGVycyI6MSwgInZhbGlkYXJpIjogInRydWUiLCAidGl0bHUiOiAiUGxhdMSDIGNvbnRyYXZhbG9hcmUgcGHImWFwb3J0In0%3D"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors cursor-pointer"
              >
                <FileText className="h-6 w-6 text-gray-400" />
                <span className="text-gray-300">Contravaloare pașaport</span>
                <ExternalLink className="h-4 w-4 text-gray-400 ml-auto" />
              </a>
              <a 
                href="https://www.ghiseul.ro/ghiseul/public/taxe/taxe-speciale/id/eyJpZEluc3QiOiA3MjExLCAidGlwUGVycyI6MCwgInZhbGlkYXJpIjogImZhbHNlIiwgInRpdGx1IjogIlBlcm1pc2UgYXV0by8gQ2VydGlmaWNhdGUgZGUgw65ubWF0cmljdWxhcmUvIEF1dG9yaXphyJtpZSBwcm92aXpvcmllIn0%3D"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors cursor-pointer"
              >
                <Car className="h-6 w-6 text-gray-400" />
                <span className="text-gray-300">Permise auto / Certificate de înmatriculare</span>
                <ExternalLink className="h-4 w-4 text-gray-400 ml-auto" />
              </a>
              <a 
                href="https://www.ghiseul.ro/ghiseul/public/taxe/taxe-speciale/id/Y29uZmlnX3RheGVfcGxhY3V0ZQ%3D%3D"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors cursor-pointer"
              >
                <Car className="h-6 w-6 text-gray-400" />
                <span className="text-gray-300">Contravaloare plăcuțe de înmatriculare</span>
                <ExternalLink className="h-4 w-4 text-gray-400 ml-auto" />
              </a>
              <a 
                href="https://www.ghiseul.ro/ghiseul/public/paid"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-4 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors cursor-pointer"
              >
                <Shield className="h-6 w-6 text-gray-400" />
                <span className="text-gray-300">Verificare Asigurare Împotriva Dezastrelor</span>
                <ExternalLink className="h-4 w-4 text-gray-400 ml-auto" />
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Info Section */}
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 text-center">
          <Info className="h-8 w-8 text-blue-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-white mb-2">
            Informații importante
          </h3>
          <p className="text-gray-300">
            Sistemul Național Electronic de Plăți vă oferă prin platforma guvernamentală Ghiseul.ro 
            posibilitatea de a plăti online taxele și impozitele locale în mod securizat.
          </p>
        </div>
      </div>
    </div>
  );
}