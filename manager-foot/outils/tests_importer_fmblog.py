import unittest
from importer_fmblog import analyser
class ImportFMB(unittest.TestCase):
    def setUp(self):
        self.target={'fmUid':'123','club':'Club témoin','clubUid':'42','country':'France','competition':'Ligue 1'}
        self.s='<link rel="canonical" href="https://database.footballmanagerblog.org/fm26/players/123-joueur"><h1>Joueur</h1>'
        labels='Corners,Crossing,Dribbling,Finishing,First Touch,Free-kick taking,Heading,Long Shots,Long Throws,Marking,Passing,Penalties,Tackling,Technique,Aggression,Anticipation,Bravery,Composure,Concentration,Decisions,Determination,Flair,Leadership,Off the ball,Positioning,Teamwork,Vision,Work Rate,Acceleration,Agility,Balance,Aerial reach,Natural Fitness,Pace,Stamina,Strength'.split(',')
        self.s+=''.join(f'<dt>{k}</dt><dd><span class="rating-bar-value"><strong>55</strong></span></dd>' for k in labels)
        self.s+='<dt>Professional Habits</dt><dd><span class="rating-bar-value"><strong>75</strong></span></dd>'
    def test_notes_et_indicateurs_separes(self):
        p=analyser(self.s,self.target);self.assertEqual(len(p['attributes']),36);self.assertEqual(p['attributes']['Crossing'],55);self.assertNotIn('Professional Habits',p['attributes']);self.assertEqual(p['fmbIndicators']['Professional Habits'],75);self.assertNotIn('wageWeekly',p)
    def test_uid_et_version(self):
        for s in [self.s.replace('/123-','/124-'),self.s.replace('/fm26/','/fm27/')]:
            with self.assertRaises(ValueError):analyser(s,self.target)
    def test_incomplet_et_hors_echelle(self):
        for s in [self.s[:200],self.s.replace('<strong>55','<strong>101')]:
            with self.assertRaises(ValueError):analyser(s,self.target)
if __name__=='__main__':unittest.main()
