import React from 'react';
import { AcademicCapIcon, LightBulbIcon, UsersIcon } from '@heroicons/react/24/outline';

const About = () => {
  const features = [
    {
      icon: <AcademicCapIcon className="h-6 w-6 text-blue-600" />,
      title: 'Learn from Experts',
      description: 'Our platform features content and discussions curated by top minds in AI and data science.'
    },
    {
      icon: <LightBulbIcon className="h-6 w-6 text-yellow-500" />,
      title: 'Innovate Together',
      description: 'Collaborate, share ideas, and turn inspiration into innovation with like-minded tech enthusiasts.'
    },
    {
      icon: <UsersIcon className="h-6 w-6 text-green-600" />,
      title: 'Build Community',
      description: 'Connect with developers, researchers, and learners around the globe through vibrant discussions.'
    }
  ];

  return (
    <div className="bg-white py-16 px-6 sm:px-12 lg:px-32">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl font-bold text-gray-900">About Nozama.ai Community</h2>
        <p className="mt-4 text-gray-600 text-lg">
          Nozama.ai is more than just a platform — it’s a space where innovation meets collaboration. Whether you're just starting out or a seasoned AI expert, our community empowers you to learn, share, and grow.
        </p>
      </div>

      <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
        {features.map((feature, index) => (
          <div
            key={index}
            className="flex flex-col items-center text-center bg-gray-50 border border-gray-200 p-6 rounded-lg shadow-sm hover:shadow-md transition"
          >
            <div className="mb-4">{feature.icon}</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
            <p className="text-gray-600 text-sm">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default About;
// This code defines an About page for the Nozama.ai community, showcasing its features and mission.