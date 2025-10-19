'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RegistraturaEmail } from '@/types/registratura';
import { Mail, Clock, CheckCircle, XCircle } from 'lucide-react';

interface RegistraturaStatsProps {
  emails: RegistraturaEmail[];
}

export function RegistraturaStats({ emails }: RegistraturaStatsProps) {
  const stats = {
    total: emails.length,
    nou: emails.filter(e => e.status === 'nou').length,
    in_lucru: emails.filter(e => e.status === 'in_lucru').length,
    rezolvat: emails.filter(e => e.status === 'rezolvat').length,
    respins: emails.filter(e => e.status === 'respins').length,
  };

  const cards = [
    {
      title: 'Total Email-uri',
      value: stats.total,
      icon: Mail,
      color: 'text-blue-600'
    },
    {
      title: 'Email-uri Noi',
      value: stats.nou,
      icon: Mail,
      color: 'text-yellow-600'
    },
    {
      title: 'În Lucru',
      value: stats.in_lucru,
      icon: Clock,
      color: 'text-orange-600'
    },
    {
      title: 'Rezolvate',
      value: stats.rezolvat,
      icon: CheckCircle,
      color: 'text-green-600'
    },
    {
      title: 'Respinse',
      value: stats.respins,
      icon: XCircle,
      color: 'text-red-600'
    }
  ];

  return (
    <div className="grid gap-4 md:grid-cols-5">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <p className="text-xs text-muted-foreground">
                {((card.value / stats.total) * 100).toFixed(1)}% din total
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}