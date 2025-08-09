import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Camera, Wand2, Download, Zap, Shield, Globe } from 'lucide-react';

export const HomePage: React.FC = () => {
  const features = [
    {
      icon: <Camera className="w-6 h-6" />,
      title: 'Screenshot Upload',
      description: 'Simply upload a screenshot of your MTG deck from any platform',
    },
    {
      icon: <Wand2 className="w-6 h-6" />,
      title: 'AI-Powered OCR',
      description: 'Advanced text recognition powered by OpenAI Vision and EasyOCR',
    },
    {
      icon: <Shield className="w-6 h-6" />,
      title: 'Card Validation',
      description: 'Automatic validation and correction via Scryfall API',
    },
    {
      icon: <Download className="w-6 h-6" />,
      title: 'Multiple Formats',
      description: 'Export to MTG Arena, Moxfield, Archidekt, and more',
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: 'Fast Processing',
      description: 'Get your deck list in seconds, not minutes',
    },
    {
      icon: <Globe className="w-6 h-6" />,
      title: 'Cross-Platform',
      description: 'Works with screenshots from any MTG platform or app',
    },
  ];

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="text-center space-y-6 py-12">
        <h1 className="text-5xl font-bold text-gray-900">
          MTG Screen-to-Deck
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Convert screenshots of your Magic: The Gathering decks into validated,
          exportable deck lists in seconds.
        </p>
        <div className="flex items-center justify-center gap-4 pt-4">
          <Link to="/converter" className="btn-primary text-lg px-8 py-3 flex items-center gap-2">
            Upload Deck Image
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link to="/about" className="btn-outline text-lg px-8 py-3">
            Learn More
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section>
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Powerful Features
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow"
            >
              <div className="text-brand-600 mb-4">{feature.icon}</div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gray-50 rounded-2xl p-8">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          How It Works
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-12 h-12 bg-brand-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
              1
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Upload Screenshot</h3>
            <p className="text-gray-600 text-sm">
              Take a screenshot of your deck and upload it
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-brand-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
              2
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">AI Processing</h3>
            <p className="text-gray-600 text-sm">
              Our AI extracts and validates card names
            </p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 bg-brand-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
              3
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">Export & Play</h3>
            <p className="text-gray-600 text-sm">
              Export to your favorite platform and start playing
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-center py-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Ready to Convert Your Deck?
        </h2>
        <p className="text-gray-600 mb-8">
          Join thousands of players saving time with automated deck conversion
        </p>
        <Link
          to="/converter"
          className="btn-primary text-lg px-10 py-4 inline-flex items-center gap-3"
        >
          <Wand2 className="w-5 h-5" />
          Start Converting Now
          <ArrowRight className="w-5 h-5" />
        </Link>
      </section>
    </div>
  );
};